import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import api from '../services/api';
import { getFullImageUrl } from '../utils/imageUrl';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { safeParsePrice } from '../utils/priceUtils';

const t = (str: string) => str;
const i18n = { language: 'en' };
const customerSocket = { on: (...args: any[]) => {}, off: (...args: any[]) => {} };

const { width } = Dimensions.get('window');

export default function OrderDetailsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { id } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();
  const tokenRef = React.useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  const isFocused = useIsFocused();

  // Review states per product ID
  const [reviewState, setReviewState] = useState<{ [key: string]: { rating: number, comment: string, isOpen: boolean, isSubmitting: boolean, submitted: boolean } }>({});

  const fetchOrder = async () => {
    if (!user || !token || !tokenRef.current) return;
    try {
      const { data } = await api.get(`/api/orders/${id}`);
      setOrder(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch order details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused && user && token) {
      fetchOrder();
    }
  }, [id, isFocused, user, token]);

  useEffect(() => {
    const handleStatusUpdate = (data: any) => {
      if (__DEV__) {
        console.log('-------------------------------------------');
        console.log('📩 [SOCKET MESSAGE RECEIVED]');
        console.log('📦 Data Payload:', JSON.stringify(data, null, 2));
        console.log('🔍 Comparing Order ID:', data.orderId, 'with Screen ID:', id);
      }

      if (String(data.orderId) === String(id)) {
        if (__DEV__) console.log('🎯 MATCH! Updating screen state.');
        setOrder((prev: any) => ({ ...prev, status: data.status }));
      } else {
        if (__DEV__) console.log('⏭️ NO MATCH. This update is for a different order.');
      }
      if (__DEV__) console.log('-------------------------------------------');
    };

    const handleInvoiceUpdate = (data: any) => {
      if (__DEV__) console.log('🧾 [INVOICE UPDATE RECEIVED]', data);
      if (String(data.orderId) === String(id)) {
        if (__DEV__) console.log('✅ Updating Invoice Number:', data.invoiceNumber);
        setOrder((prev: any) => ({ ...prev, hisaabKitaabInvoiceNumber: data.invoiceNumber }));
      }
    };

    // Fired when admin updates a single item's status
    const handleItemStatusUpdate = (data: any) => {
      if (__DEV__) console.log('📦 [ITEM STATUS UPDATE RECEIVED]', data);
      if (String(data.orderId) === String(id)) {
        setOrder((prev: any) => {
          if (!prev || !prev.items) return prev;
          const newItems = prev.items.map((item: any) => {
            if (String(item._id) === String(data.itemId)) {
              return { ...item, status: data.status };
            }
            return item;
          });
          return { ...prev, items: newItems };
        });
      }
    };

    // Fired when admin updates a group status — carries full updatedOrder
    const handleOrderUpdated = (data: any) => {
      if (__DEV__) console.log('🔄 [ORDER UPDATED RECEIVED]', data);
      if (String(data.orderId) === String(id)) {
        setOrder((prev: any) => {
          if (!prev) return prev;
          const incoming = data.updatedOrder;
          if (!incoming) return { ...prev, status: data.status };
          const mergedItems = prev.items?.map((prevItem: any) => {
            const updated = incoming.items?.find((u: any) => String(u._id) === String(prevItem._id));
            return updated ? { ...prevItem, status: updated.status } : prevItem;
          }) ?? prev.items;
          return { ...prev, status: incoming.status ?? data.status, items: mergedItems };
        });
      }
    };

    customerSocket.on('order-status-update', handleStatusUpdate);
    customerSocket.on('invoice-number-updated', handleInvoiceUpdate);
    customerSocket.on('item-status-update', handleItemStatusUpdate);
    customerSocket.on('order-updated', handleOrderUpdated);

    return () => {
      customerSocket.off('order-status-update', handleStatusUpdate);
      customerSocket.off('invoice-number-updated', handleInvoiceUpdate);
      customerSocket.off('item-status-update', handleItemStatusUpdate);
      customerSocket.off('order-updated', handleOrderUpdated);
    };
  }, [id]);

  const toggleReviewForm = (productId: string) => {
    setReviewState(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        isOpen: !prev[productId]?.isOpen,
        rating: prev[productId]?.rating || 5,
        comment: prev[productId]?.comment || ''
      }
    }));
  };

  const submitProductReview = async (productId: string) => {
    const currentReview = reviewState[productId];
    if (!currentReview || !currentReview.comment.trim()) return;

    try {
      setReviewState(prev => ({ ...prev, [productId]: { ...prev[productId], isSubmitting: true } }));

      await api.post(`/api/products/${productId}/reviews`, {
        orderId: id,
        rating: currentReview.rating,
        comment: currentReview.comment
      });

      setReviewState(prev => ({
        ...prev,
        [productId]: { ...prev[productId], isSubmitting: false, submitted: true, isOpen: false }
      }));
      Alert.alert('Success', 'Review submitted successfully!');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to submit review');
      setReviewState(prev => ({ ...prev, [productId]: { ...prev[productId], isSubmitting: false } }));
    }
  };

  if (loading || !order) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Accepted': return t('Order accepted & being processed');
      case 'Order Ready to Ship': return t('Packed & ready to ship');
      case 'Rider at hub for pickup': return t('Rider arriving at hub');
      case 'Order Picked': return t('Order picked up by rider');
      case 'Order on way':
      case 'dispatched': return t('Order is on the way');
      case 'Order Delivered': return t('Delivered successfully!');
      case 'Payment Received': return t('Payment received by MatAll');
      case 'Cancelled': return t('This order was cancelled');
      default: return status || t('Processing your order');
    }
  };

  const getItemStatusDisplay = (itemStatus: string, orderStatus: string) => {
    let statusToUse = (itemStatus && itemStatus !== 'Pending') ? itemStatus : orderStatus;
    
    const statusRank: Record<string, number> = {
      'Pending': 0, 'Accepted': 1, 'Order Ready to Ship': 2, 'Rider at hub for pickup': 3,
      'Order Picked': 4, 'Order on way': 5, 'dispatched': 5, 'Order Delivered': 6, 'Payment Received': 7
    };
    
    if (statusRank[orderStatus] > (statusRank[itemStatus] || 0) && itemStatus !== 'Cancelled') {
      statusToUse = orderStatus;
    }

    switch (statusToUse) {
      case 'Accepted': return { text: t('Accepted'), color: '#3b82f6', bg: '#eff6ff' };
      case 'Order Ready to Ship': return { text: t('Packed'), color: '#eab308', bg: '#fefce8' };
      case 'Rider at hub for pickup': return { text: t('Rider arriving'), color: '#f97316', bg: '#fff7ed' };
      case 'Order Picked': return { text: t('Picked up'), color: '#8b5cf6', bg: '#f5f3ff' };
      case 'Order on way':
      case 'dispatched': return { text: t('On the way'), color: '#10b981', bg: '#ecfdf5' };
      case 'Order Delivered': return { text: t('Delivered'), color: '#16a34a', bg: '#f0fdf4' };
      case 'Payment Received': return { text: t('Payment Received'), color: '#06b6d4', bg: '#ecfeff' };
      case 'Cancelled': return { text: t('Cancelled'), color: '#ef4444', bg: '#fef2f2' };
      default: return { text: statusToUse || t('Processing'), color: '#64748b', bg: '#f8fafc' };
    }
  };

  const hasMultipleStatuses = (() => {
    if (!order?.items || order.items.length <= 1) return false;
    const firstItemStatus = (order.items[0].status && order.items[0].status !== 'Pending') ? order.items[0].status : order.status;
    return order.items.some((item: any) => {
      const currentStatus = (item.status && item.status !== 'Pending') ? item.status : order.status;
      return currentStatus !== firstItemStatus;
    });
  })();

  const ORDER_STAGES = [
    { key: 'Accepted', label: t('Accepted') },
    { key: 'Order Ready to Ship', label: t('Packed') },
    { key: 'Dispatched', label: t('Dispatched') },
    { key: 'Order on way', label: t('On Way') },
    { key: 'Order Delivered', label: t('Delivered') },
  ];

  const getStageIndex = (status: string) => {
    const rank: Record<string, number> = {
      'Accepted': 0,
      'Order Ready to Ship': 1,
      'Rider at hub for pickup': 1,
      'Order Picked': 2,
      'Dispatched': 2,
      'Order on way': 3,
      'dispatched': 3,
      'Order Delivered': 4,
      'Payment Received': 4,
      'Cancelled': -1,
    };
    return rank[status] ?? -1;
  };

  const renderItemProgressBar = (item: any) => {
    const rawStatus = (item.status && item.status !== 'Pending') ? item.status : order.status;
    const statusRank: Record<string, number> = {
      'Pending': 0, 'Accepted': 1, 'Order Ready to Ship': 2, 'Rider at hub for pickup': 3,
      'Order Picked': 4, 'Order on way': 5, 'dispatched': 5, 'Order Delivered': 6, 'Payment Received': 7
    };
    const itemRank = statusRank[item.status] || 0;
    const orderRank = statusRank[order.status] || 0;
    const effectiveStatus = (orderRank > itemRank && item.status !== 'Cancelled') ? order.status : rawStatus;
    const isCancelled = effectiveStatus === 'Cancelled';
    const activeIndex = isCancelled ? -1 : Math.max(0, getStageIndex(effectiveStatus));

    if (isCancelled) {
      return (
        <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="close-circle-outline" size={15} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '800' }}>{t('Item Cancelled')}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={{ marginTop: 12, paddingHorizontal: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {ORDER_STAGES.map((stage, idx) => {
            const isCompleted = activeIndex >= idx;
            const isActive = activeIndex === idx;
            const isLast = idx === ORDER_STAGES.length - 1;
            return (
              <React.Fragment key={stage.key}>
                <View style={{ alignItems: 'center', flex: isLast ? 0 : undefined }}>
                  <View style={[
                    {
                      width: isActive ? 14 : 10,
                      height: isActive ? 14 : 10,
                      borderRadius: isActive ? 7 : 5,
                      borderWidth: isActive ? 2 : 0,
                      borderColor: isActive ? '#22C55E' : 'transparent',
                      backgroundColor: isCompleted ? '#22C55E' : '#E2E8F0',
                    }
                  ]} />
                </View>
                {!isLast && (
                  <View style={{
                    flex: 1,
                    height: 3,
                    backgroundColor: activeIndex >= idx ? '#22C55E' : '#E2E8F0',
                    borderRadius: 2,
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
          {ORDER_STAGES.map((stage, idx) => {
            const isActive = activeIndex >= idx;
            return (
              <Text key={stage.key} style={{
                fontSize: 9,
                fontWeight: isActive ? '800' : '500',
                color: isActive ? '#22C55E' : '#94A3B8',
                textAlign: 'center',
                flex: idx < ORDER_STAGES.length - 1 ? 1 : undefined,
                minWidth: 36,
              }}>{stage.label}</Text>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('orderDetails')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.iconBtn}>
          <Ionicons name="home-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <View style={styles.statusIconBox}>
            <MaterialCommunityIcons name="package-variant-closed" size={32} color="#22C55E" />
          </View>
          <Text style={styles.statusTitle}>{getStatusText(order.status)}</Text>
          <Text style={styles.orderIdText}>{t('Order ID:')} #{order._id.toUpperCase()}</Text>
          {order.isRentalPackage && (
            <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 10 }}>
              <Text style={{ color: '#854D0E', fontSize: 12, fontWeight: '800' }}>⭐ {t('Rental Package Order')}</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('Shipment Details')}</Text>
          <View style={styles.itemBadge}>
            <Text style={styles.itemBadgeText}>{order.items?.length} {order.items?.length === 1 ? t('item') : t('items')}</Text>
          </View>

          {hasMultipleStatuses && (
            <View style={{
              backgroundColor: '#fff7ed',
              borderColor: '#ffedd5',
              borderWidth: 1,
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8
            }}>
              <Feather name="package" size={16} color="#c2410c" />
              <Text style={{ color: '#c2410c', fontSize: 13, fontWeight: '500', flex: 1, marginLeft: 8 }}>
                {t('items_processed_separately')}
              </Text>
            </View>
          )}

          {order.items?.map((item: any, idx: number) => {
            const pId = item.productId?._id || item.productId || item._id;
            const rState = reviewState[pId];
            const variantName = item.selectedVariant;

            // Universal Robust Mapping (Web Logic + Mobile Snapshots + Deep Recovery)
            const snapshot = item.selectedVariantData || {};
            const getLocVal = (enVal: string, hiVal: string) => (i18n.language === 'hi' && hiVal) ? hiVal : enVal;

            const pName = getLocVal(
              item?.productId?.productName || item?.productId?.name || item.productName || item.name || 'Product',
              item?.productId?.name_hi || item?.name_hi
            );
            const rawBrand = item.productId?.brand || item.brand || 'Brand';
            const rawBrandHi = item.productId?.brand_hi || item.brand_hi;
            const pBrand = getLocVal(rawBrand, rawBrandHi).toUpperCase();

            const imgSrc = getFullImageUrl(item.variantImage || item.productId?.images?.[0] || item.productId?.imageUrl || '');

            // Attribute parsing logic from web
            let rawAttrs = item.selectedVariantData?.attributes || item.variantAttributes || item.productId?.variants?.find((v: any) => v.name === variantName)?.attributes;
            if (i18n.language === 'hi') {
              const hiAttrs = item.selectedVariantData?.attributes_hi || item.productId?.variants?.find((v: any) => v.name === variantName)?.attributes_hi;
              if (hiAttrs) rawAttrs = hiAttrs;
            }
            const parsed = rawAttrs instanceof Map ? Object.fromEntries(rawAttrs) : (rawAttrs?._doc || rawAttrs);
            const internalKeys = new Set(['$__parent', '$__path', '$__schemaType', '_doc', '$__', '$isNew', '_id']);
            const attrs = parsed && typeof parsed === 'object'
              ? Object.fromEntries(Object.entries(parsed).filter(([k]) => !internalKeys.has(k) && !k.startsWith('$')))
              : null;

            return (
              <View key={idx} style={styles.itemRowWrapper}>
                <TouchableOpacity
                  style={styles.productRow}
                  onPress={() => navigation.navigate('Details', { productId: pId })}
                >
                  <View style={styles.itemThumbBox}>
                    <Image
                      source={{ uri: imgSrc }}
                      style={styles.productImage}
                      defaultSource={{ uri: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecb?auto=format&fit=crop&q=80&w=400' }}
                    />
                  </View>
                  <View style={[styles.productInfo, { flex: 1 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={styles.brandLabel}>{pBrand}</Text>
                      {(() => {
                        const displayStatus = getItemStatusDisplay(item.status, order.status);
                        return (
                          <View style={{ 
                            backgroundColor: displayStatus.bg, 
                            paddingHorizontal: 8, 
                            paddingVertical: 2, 
                            borderRadius: 12 
                          }}>
                            <Text style={{ 
                              color: displayStatus.color, 
                              fontSize: 10, 
                              fontWeight: '700', 
                              textTransform: 'uppercase' 
                            }}>
                              {displayStatus.text}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                    <Text style={styles.productNameBold}>{pName}</Text>

                    <View style={styles.specTags}>
                      {(!attrs || Object.keys(attrs).length === 0) ? (
                        <View style={styles.specTag}><Text style={styles.specTagText}>{variantName || 'Standard'}</Text></View>
                      ) : (
                        Object.entries(attrs).map(([k, v]: any) => (
                          <View key={k} style={styles.specTag}>
                            <Text style={styles.specTagText}>{k}: {v}</Text>
                          </View>
                        ))
                      )}
                    </View>

                    <View style={styles.itemPriceQtyRow}>
                      <View style={styles.qtyPill}>
                        <Text style={styles.qtyPillText}>{t('Qty:')} {item.quantity}</Text>
                      </View>
                      <Text style={styles.priceBold}>₹{safeParsePrice(item.unitPrice || item.price || 0).toFixed(2)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {order.status === 'Order Delivered' && (
                  <View style={styles.reviewSection}>
                    {rState?.submitted ? (
                      <Text style={styles.reviewSubmittedText}>✓ Review Submitted</Text>
                    ) : (
                      <TouchableOpacity onPress={() => toggleReviewForm(pId)}>
                        <Text style={styles.writeReviewText}>
                          {rState?.isOpen ? 'Cancel Review' : 'Write a Review'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {rState?.isOpen && !rState?.submitted && (
                      <View style={styles.reviewFormContainer}>
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <TouchableOpacity
                              key={s}
                              onPress={() => setReviewState(prev => ({ ...prev, [pId]: { ...prev[pId], rating: s } }))}
                            >
                              <Ionicons
                                name={s <= (rState?.rating || 5) ? "star" : "star-outline"}
                                size={28}
                                color={s <= (rState?.rating || 5) ? "#FACC15" : "#CBD5E1"}
                                style={{ marginRight: 5 }}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={styles.reviewInput}
                          placeholder="Share your experience..."
                          multiline
                          numberOfLines={3}
                          value={rState?.comment || ''}
                          onChangeText={(t) => setReviewState(prev => ({ ...prev, [pId]: { ...prev[pId], comment: t } }))}
                        />
                        <TouchableOpacity
                          style={styles.submitReviewBtn}
                          disabled={rState?.isSubmitting}
                          onPress={() => submitProductReview(pId)}
                        >
                          {rState?.isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={styles.submitReviewBtnText}>Submit</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Per-item progress bar */}
                {renderItemProgressBar(item)}
              </View>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.billHeaderRow}>
            <Text style={styles.sectionTitle}>{t('Bill Summary')}</Text>
            {(() => {
              const savings = (order.totalSavings !== undefined && order.totalSavings !== null)
                ? safeParsePrice(order.totalSavings)
                : (order.items?.reduce((acc: number, item: any) => {
                  const paidPrice = safeParsePrice(item.unitPrice || item.price || 0);
                  const mrp = safeParsePrice(item.unitMrp || item.mrp || item.selectedVariantData?.pricing?.mrp || 0);
                  if (mrp && mrp > paidPrice) {
                    return acc + (mrp - paidPrice) * item.quantity;
                  }
                  return acc;
                }, 0) || 0);
              return savings > 0 ? (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsBadgeText}>You saved ₹{savings.toFixed(2)}</Text>
                </View>
              ) : null;
            })()}
          </View>

          <View style={styles.billRow}>
            <View style={styles.billLabelRow}>
              <Ionicons name="cube-outline" size={16} color="#64748B" />
              <Text style={styles.billLabel}>{t('Item Total (Excl. GST)')}</Text>
            </View>
            <Text style={styles.billValue}>₹{safeParsePrice(order.totalBaseAmount || 0).toFixed(2)}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabelSmall}>{t('GST Amount')}</Text>
            <Text style={styles.billValueSmall}>₹{safeParsePrice(order.totalTaxAmount || 0).toFixed(2)}</Text>
          </View>

          {(order.deliveryCharge || 0) > 0 && (
            <View style={styles.billRow}>
              <View>
                <Text style={styles.billLabelSmall}>{t('Delivery Charge (incl GST)')}</Text>
                {order.deliveryChargeGST > 0 && (
                  <Text style={styles.billSubLabel}>
                    (₹{(order.deliveryCharge - order.deliveryChargeGST).toFixed(2)} + ₹{order.deliveryChargeGST.toFixed(2)} GST)
                  </Text>
                )}
              </View>
              <Text style={styles.billValueSmall}>₹{safeParsePrice(order.deliveryCharge || 0).toFixed(2)}</Text>
            </View>
          )}

          {(order.platformFee || 0) > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabelSmall}>Handling Charge (incl GST)</Text>
              <Text style={styles.billValueSmall}>₹{safeParsePrice(order.platformFee || 0).toFixed(2)}</Text>
            </View>
          )}

          {order.isRentalPackage && (
            <>
              <View style={styles.billRow}>
                <Text style={styles.billLabelSmall}>Rental Installation Fee</Text>
                <Text style={[styles.billValueSmall, (order.rentalInstallationFee || 0) === 0 && { color: '#22C55E' }]}>
                  {order.rentalInstallationFee > 0 ? `₹${safeParsePrice(order.rentalInstallationFee).toFixed(2)}` : 'FREE'}
                </Text>
              </View>
              {order.rentalInstallationBreakup && order.rentalInstallationBreakup.length > 0 && (
                <View style={{ paddingLeft: 12, marginBottom: 12 }}>
                  {order.rentalInstallationBreakup.map((item: any, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>• {item.name} (x{item.quantity})</Text>
                      <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>{item.isFree ? 'Free' : `₹${(item.rate * item.quantity).toFixed(2)}`}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {safeParsePrice(order.appliedDiscount || 0) - safeParsePrice(order.pointsRedeemed || 0) > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabelSmall, { color: '#22C55E' }]}>Offer Discount</Text>
              <Text style={[styles.billValueSmall, { color: '#22C55E' }]}>-₹{(safeParsePrice(order.appliedDiscount || 0) - safeParsePrice(order.pointsRedeemed || 0)).toFixed(2)}</Text>
            </View>
          )}

          {safeParsePrice(order.pointsRedeemed || 0) > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabelSmall}>Points Redeemed</Text>
              <Text style={styles.billValueSmall}>-₹{safeParsePrice(order.pointsRedeemed || 0).toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.billDivider} />

          <View style={styles.billRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>₹{safeParsePrice(order.totalAmount || 0).toFixed(2)}</Text>
          </View>

          <View style={styles.paymentBadge}>
            <Text style={styles.paymentBadgeText}>{t('PAID VIA')} {order.paymentMethod?.toUpperCase() || 'COD'}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Information</Text>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>PLACED AT</Text>
            <Text style={styles.infoValue}>
              {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {order.hisaabKitaabInvoiceNumber &&
            !order.hisaabKitaabInvoiceNumber.toLowerCase().includes('error') &&
            !order.hisaabKitaabInvoiceNumber.toLowerCase().includes('not found') &&
            !order.hisaabKitaabInvoiceNumber.toLowerCase().includes('missing') && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>OFFICIAL INVOICE</Text>
                <Text style={styles.infoValueGreen}>
                  {order.hisaabKitaabInvoiceNumber}
                </Text>
              </View>
            )}

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>DELIVERING TO</Text>
            <Text style={styles.deliveryName}>{order.deliveryAddress?.name || 'Home'}</Text>
            <Text style={styles.deliveryAddress}>
              {order.deliveryAddress?.fullAddress || order.shippingAddress || 'No address provided'}
            </Text>
            {order.deliveryAddress?.contactPhone && (
              <View style={styles.phoneRow}>
                <Ionicons name="call" size={14} color="#22C55E" />
                <Text style={styles.phoneText}>{order.deliveryAddress.contactPhone}</Text>
              </View>
            )}
          </View>
        </View>


        <TouchableOpacity style={styles.supportBtn} onPress={() => navigation.navigate('MainTab', { screen: 'SUPPORT' })}>
          <View style={styles.supportLeft}>
            <Ionicons name="chatbubble-outline" size={20} color="#1E293B" />
            <Text style={styles.supportText}>Need support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>

        <View style={{ height: Math.max(insets.bottom, 16) + 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#000' },

  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statusIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: { fontSize: 22, fontWeight: '900', color: '#000', textAlign: 'center', marginBottom: 8 },
  orderIdText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },

  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#1E293B', marginBottom: 15 },

  itemBadge: {
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  itemBadgeText: { fontSize: 12, color: '#3B82F6', fontWeight: '800' },

  itemRowWrapper: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 16,
    overflow: 'hidden',
  },
  productRow: { flexDirection: 'row' },
  itemThumbBox: {
    width: 85,
    height: 85,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productInfo: { flex: 1, marginLeft: 15, justifyContent: 'space-between' },
  brandLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 2 },
  productNameBold: { fontSize: 15, fontWeight: '900', color: '#1E293B', marginBottom: 4 },
  specTags: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  specTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  specTagText: { fontSize: 10, color: '#475569', fontWeight: '700' },
  itemPriceQtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  qtyPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  qtyPillText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  priceBold: { fontSize: 16, fontWeight: '900', color: '#000' },

  reviewSection: {
    marginTop: 15,
    paddingLeft: 95,
  },
  reviewSubmittedText: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: '700',
  },
  writeReviewText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
  },
  reviewFormContainer: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 12,
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  reviewInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 10,
    color: '#1E293B',
  },
  submitReviewBtn: {
    backgroundColor: '#000',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitReviewBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

  billHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  savingsBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  savingsBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#22C55E',
  },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  billLabelRow: { flexDirection: 'row', alignItems: 'center' },
  billLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginLeft: 8 },
  billValue: { fontSize: 14, fontWeight: '800', color: '#000' },
  billLabelSmall: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  billValueSmall: { fontSize: 13, fontWeight: '700', color: '#000' },
  billSubLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  billDivider: { height: 1, backgroundColor: '#F1F5F9', borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#CBD5E1', marginVertical: 15 },
  grandTotalLabel: { fontSize: 18, fontWeight: '900', color: '#000' },
  grandTotalValue: { fontSize: 18, fontWeight: '900', color: '#000' },
  paymentBadge: {
    backgroundColor: '#22C55E',
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 15,
  },
  paymentBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  infoBlock: { marginBottom: 20 },
  infoLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 6 },
  infoValue: { fontSize: 15, fontWeight: '900', color: '#1E293B' },
  infoValueGreen: { fontSize: 15, fontWeight: '900', color: '#22C55E' },
  deliveryName: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginBottom: 4 },
  deliveryAddress: { fontSize: 13, color: '#64748B', lineHeight: 20, fontWeight: '600', marginBottom: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center' },
  phoneText: { fontSize: 14, fontWeight: '800', color: '#22C55E', marginLeft: 6 },

  supportBtn: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  supportLeft: { flexDirection: 'row', alignItems: 'center' },
  supportText: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginLeft: 12 },
});
