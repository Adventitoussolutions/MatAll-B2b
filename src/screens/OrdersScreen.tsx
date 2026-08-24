import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import api from '../services/api';
import { getFullImageUrl } from '../utils/imageUrl';
import { useAuth } from '../context/AuthContext';
import { useIsFocused } from '@react-navigation/native';
import { safeParsePrice } from '../utils/priceUtils';

const t = (str: string) => {
  if (str === 'orders.tabs.all') return 'All';
  if (str === 'orders.tabs.pending') return 'Pending';
  if (str === 'orders.tabs.accepted') return 'Accepted';
  if (str === 'orders.tabs.dispatched') return 'Dispatched';
  if (str === 'orders.tabs.delivered') return 'Delivered';
  return str;
};
const customerSocket = { on: (...args: any[]) => {}, off: (...args: any[]) => {} };
const isLoggingOut = false;

export default function OrdersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const tokenRef = React.useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedProductForRating, setSelectedProductForRating] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const isFocused = useIsFocused();

  const fetchOrders = async () => {
    if (!user || !token || !tokenRef.current) return;
    try {
      setLoading(true);
      const { data } = await api.get('/api/orders/my-orders');
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused && !isLoggingOut) {
      fetchOrders();
    }
  }, [isFocused, user, token, isLoggingOut]);

  useEffect(() => {
    const handleStatusUpdate = (data: any) => {
      setOrders(prev => prev.map(o => String(o._id) === String(data.orderId) ? { ...o, status: data.status } : o));
    };

    const handleInvoiceUpdate = (data: any) => {
      setOrders(prev => prev.map(o => String(o._id) === String(data.orderId) ? { ...o, hisaabKitaabInvoiceNumber: data.invoiceNumber } : o));
    };

    customerSocket.on('order-status-update', handleStatusUpdate);
    customerSocket.on('invoice-number-updated', handleInvoiceUpdate);

    return () => {
      customerSocket.off('order-status-update', handleStatusUpdate);
      customerSocket.off('invoice-number-updated', handleInvoiceUpdate);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const openRatingModal = (order: any) => {
    setSelectedOrder(order);
    setSelectedProductForRating(null);
    setRating(5);
    setComment('');
    setRatingModalVisible(true);
  };

  const handleRatingSubmit = async () => {
    if (!selectedProductForRating || !selectedOrder || !token) return;

    try {
      setSubmittingReview(true);
      const productId = selectedProductForRating.productId?._id || selectedProductForRating.productId;

      await api.post(`/api/products/${productId}/reviews`, {
        orderId: selectedOrder._id,
        rating,
        comment
      });

      setRatingModalVisible(false);
    } catch (err) {
      console.error('Failed to submit review', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('cancel')) return { bg: '#FEE2E2', text: '#991B1B' };
    if (s.includes('delivered') || s.includes('accept')) return { bg: '#DCFCE7', text: '#166534' };
    if (s.includes('pending')) return { bg: '#FEF3C7', text: '#92400E' };
    return { bg: '#F3F4F6', text: '#374151' };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('Order History')}</Text>
          <Text style={styles.headerSubtitle}>{t('TRACK & MANAGE')}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.iconBtn}>
          <Ionicons name="home-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && orders.length === 0 ? (
          <View style={{ height: 400, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : orders.length === 0 ? (
          <View style={{ height: 400, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
            <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748B', marginTop: 16 }}>{t('noOrdersYet')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Shop')}
              style={{ marginTop: 20, backgroundColor: '#FFE100', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
            >
              <Text style={{ fontWeight: '900' }}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((order) => {
            const statusStyle = getStatusStyle(order.status);
            const isCancelled = (order.status || '').toLowerCase().includes('cancel');
            const date = new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
            const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View key={order._id} style={styles.orderCard}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('OrderDetails', { id: order._id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={[styles.savingsText, isCancelled && { textDecorationLine: 'line-through', color: '#94A3B8' }]}>
                        {(() => {
                          const savings = (order.totalSavings !== undefined && order.totalSavings !== null)
                            ? order.totalSavings
                            : (order.items?.reduce((acc: number, item: any) => {
                                const paidPrice = safeParsePrice(item.unitPrice || item.price || 0);
                                const mrp = safeParsePrice(item.unitMrp || item.mrp || item.selectedVariantData?.pricing?.mrp || 0);
                                if (mrp && mrp > paidPrice) {
                                  return acc + (mrp - paidPrice) * item.quantity;
                                }
                                return acc;
                              }, 0) || 0);
                          return savings > 0 ? `Savings of ₹${safeParsePrice(savings).toFixed(2)}` : 'Great Deal';
                        })()}
                        {(order.status || '').toLowerCase().includes('delivered') ? ', Delivered in 45 mins' : ''}
                      </Text>
                      <Text style={styles.priceDateText}>₹{safeParsePrice(order.totalAmount).toFixed(2)}, {date}, {time}</Text>
                      {order.hisaabKitaabInvoiceNumber &&
                        !order.hisaabKitaabInvoiceNumber.toLowerCase().includes('error') &&
                        !order.hisaabKitaabInvoiceNumber.toLowerCase().includes('not found') &&
                        !order.hisaabKitaabInvoiceNumber.toLowerCase().includes('missing') && (
                          <Text style={[styles.invoiceText, { color: '#16a34a' }]}>
                            Invoice: {order.hisaabKitaabInvoiceNumber}
                          </Text>
                        )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748B" />
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 }}>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, marginBottom: 0 }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>{t((order.status || '').toUpperCase())}</Text>
                    </View>
                    {order.isRentalPackage && (
                      <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ color: '#854D0E', fontSize: 11, fontWeight: '800' }}>⭐ RENTAL PACKAGE</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.productRow}>
                    {order.items?.slice(0, 3).map((item: any, idx: number) => {
                      const prod = item.productId || item.product;
                      const imgSrc = getFullImageUrl(item.variantImage || prod?.imageUrl || (prod?.images && prod?.images?.[0]) || prod?.image);
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            const prodId = item.productId?._id || item.productId || item.product?._id;
                            if (prodId) {
                              navigation.navigate('Shop', { screen: 'Details', params: { productId: prodId } });
                            }
                          }}
                        >
                          <Image
                            source={{ uri: imgSrc }}
                            style={[styles.productImage, { marginRight: 8 }]}
                          />
                        </TouchableOpacity>
                      );
                    })}
                    {order.items?.length > 3 && (
                      <View style={[styles.productImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }]}>
                        <Text style={{ fontSize: 12, fontWeight: '700' }}>+{order.items.length - 3}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      if (order.items?.length === 1) {
                        const firstItem = order.items[0];
                        const prodId = firstItem?.productId?._id || firstItem?.productId || firstItem?.product?._id;
                        if (prodId) {
                          navigation.navigate('Shop', { screen: 'Details', params: { productId: prodId } });
                        }
                      } else {
                        navigation.navigate('OrderDetails', { id: order._id });
                      }
                    }}
                  >
                    <Text style={styles.actionBtnText}>
                      {order.items?.length === 1 ? t('View Product') : t('View Items')}
                    </Text>
                  </TouchableOpacity>
                  {!(order.status || '').toLowerCase().includes('cancelled') && (
                    <>
                      <View style={styles.verticalDivider} />
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openRatingModal(order)}
                      >
                        <Text style={styles.actionBtnText}>{t('Rate')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={ratingModalVisible}
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rate your items</Text>
                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setRatingModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {!selectedProductForRating ? (
                <>
                  <Text style={styles.modalSubtitle}>Which item would you like to rate?</Text>
                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                    {selectedOrder?.items?.map((item: any, idx: number) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.ratingCard}
                        onPress={() => setSelectedProductForRating(item)}
                      >
                        <Image
                          source={{ uri: getFullImageUrl(item.variantImage || item.productId?.images?.[0] || item.productId?.imageUrl) }}
                          style={styles.ratingImage}
                        />
                        <Text style={styles.ratingItemName} numberOfLines={2}>
                          {item.productId?.productName || item.productId?.name || item.product?.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              ) : (
                <View>
                  <View style={styles.selectedProductHeader}>
                    <Image
                      source={{ uri: getFullImageUrl(selectedProductForRating.variantImage || selectedProductForRating.productId?.images?.[0] || selectedProductForRating.productId?.imageUrl) }}
                      style={styles.selectedProductImage}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedProductName} numberOfLines={1}>
                        {selectedProductForRating.productId?.productName || selectedProductForRating.productId?.name || selectedProductForRating.product?.name}
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedProductForRating(null)}>
                        <Text style={styles.changeItemText}>Change item</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.tapToRateText}>Tap to rate</Text>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <TouchableOpacity key={s} onPress={() => setRating(s)}>
                        <Ionicons
                          name={s <= rating ? "star" : "star-outline"}
                          size={40}
                          color={s <= rating ? "#FACC15" : "#CBD5E1"}
                          style={{ marginHorizontal: 4 }}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={styles.reviewInput}
                    placeholder="What did you like or dislike about this product? (Optional)"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    value={comment}
                    onChangeText={setComment}
                  />

                  <TouchableOpacity
                    style={[styles.submitBtn, submittingReview && { opacity: 0.7 }]}
                    onPress={handleRatingSubmit}
                    disabled={submittingReview}
                  >
                    {submittingReview ? (
                      <ActivityIndicator color="#FFE100" />
                    ) : (
                      <Text style={styles.submitBtnText}>Submit Review</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#000' },
  headerSubtitle: { fontSize: 10, color: '#64748B', fontWeight: '800', letterSpacing: 1 },

  scrollView: { padding: 12 },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  savingsText: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  priceDateText: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 2 },
  invoiceText: { fontSize: 11, color: '#22C55E', fontWeight: '700', marginTop: 2 },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 15,
  },
  statusText: { fontSize: 11, fontWeight: '800' },

  productRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#22C55E',
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#F1F5F9',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000',
  },
  closeModalBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 25,
    fontWeight: '500',
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  ratingImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#F8FAFC',
  },
  ratingItemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  selectedProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  selectedProductImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  selectedProductName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  changeItemText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '700',
    marginTop: 2,
  },
  tapToRateText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 25,
  },
  reviewInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 15,
    padding: 15,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#000',
    marginBottom: 25,
  },
  submitBtn: {
    backgroundColor: '#000',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFE100',
    fontSize: 16,
    fontWeight: '900',
  },
});
