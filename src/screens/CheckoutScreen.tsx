import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import LocationModal from '../components/LocationModal';
import OfflineBanner from '../components/OfflineBanner';
import { Colors } from '../constants/Colors';
import { Jobsite, useAuth } from '../context/AuthContext';
import { CartItem, useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import api from '../services/api';

import { findMatchingJobsite } from '../utils/locationUtils';
import { safeParsePrice } from '../utils/priceUtils';
import { isServiceOffline as checkServiceOffline } from '../utils/serviceStatus';


const { width } = Dimensions.get('window');



interface LoyaltyOffer {
  _id: string;
  title: string;
  description?: string;
  offerType: string;
  minAmount: number;
  validityDays?: number;
}

interface LoyaltyClaim {
  _id: string;
  isCompleted: boolean;
  expiresAt: string;
}

export default function CheckoutScreen({ navigation }: { navigation: any }) {
  const {
    cart, calculations, loading: calculationsLoading, clearCart,
    deliveryAddress, setDeliveryAddress, setIsManualSelection, applyCoupon, removeCoupon, appliedCouponCode,
    pointsToRedeem, applyPoints, removePoints
  } = useCart();
  const { user: rawUser, token, refreshProfile } = useAuth();
  const tokenRef = React.useRef(token);

  React.useEffect(() => {
    if (token) {
      refreshProfile();
    }
  }, [token]);

  React.useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const user = rawUser as any | null;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = React.useState(false);
  const { settings, serverTimeOffset } = useSettings();

  const [splitModalVisible, setSplitModalVisible] = React.useState(false);
  const [countdown, setCountdown] = React.useState(10);
  const [locationModalVisible, setLocationModalVisible] = React.useState(false);
  const [showCancellationPolicy, setShowCancellationPolicy] = React.useState(false);
  const [availableCoupons, setAvailableCoupons] = React.useState<any[]>([]);
  const [couponsModalVisible, setCouponsModalVisible] = React.useState(false);
  const [couponInput, setCouponInput] = React.useState('');
  const [activeChallenge, setActiveChallenge] = React.useState<LoyaltyClaim | null>(null);
  const [loyaltyOffer, setLoyaltyOffer] = React.useState<LoyaltyOffer | null>(null);

  // Ref to hold the delayed Razorpay timeout so it survives effect re-runs
  const splitPaymentTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up the ref timeout on unmount
  React.useEffect(() => {
    return () => {
      if (splitPaymentTimeoutRef.current) {
        clearTimeout(splitPaymentTimeoutRef.current);
      }
    };
  }, []);

  // ── Affiliate points redemption ──────────────────────────────────────────
  const pointsBalance = user?.walletBalance || 0;
  const [showRedeemInput, setShowRedeemInput] = React.useState(false);
  const [redeemInput, setRedeemInput] = React.useState('');
  const redeemedPoints = pointsToRedeem;

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (splitModalVisible && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (splitModalVisible && countdown === 0) {
      setSplitModalVisible(false);
      // Delay Razorpay launch to let the modal fully dismiss on iOS.
      // iOS UIKit crashes if a new view controller is presented while
      // another is still animating its dismissal.
      splitPaymentTimeoutRef.current = setTimeout(() => {
        startRazorpayPayment('Split');
        splitPaymentTimeoutRef.current = null;
      }, 600);
    }
    return () => {
      if (timer) clearInterval(timer);
      // NOTE: Do NOT clear splitPaymentTimeoutRef here — it must
      // survive the re-render caused by setSplitModalVisible(false).
    };
  }, [splitModalVisible, countdown]);

  const calculationsData = (calculations || {}) as any;
  const totalAmount = safeParsePrice(calculationsData.totalAmount || 0);
  const totalBaseAmount = safeParsePrice(calculationsData.totalBaseAmount || 0);
  const totalTaxAmount = safeParsePrice(calculationsData.totalTaxAmount || 0);
  const deliveryCharge = safeParsePrice(calculationsData.deliveryCharge || 0);
  const deliveryChargeBreakup = {
    base: safeParsePrice(calculationsData.deliveryChargeBreakup?.base || 0),
    gst: safeParsePrice(calculationsData.deliveryChargeBreakup?.gst || 0)
  };
  const platformFee = safeParsePrice(calculationsData.platformFee || 0);
  const vehicleClass = calculationsData.vehicleClass || 'Bike';
  const appliedOffers = calculationsData.appliedOffers || [];
  const rewardItems = calculationsData.rewardItems || [];
  const totalSavings = safeParsePrice(calculationsData.totalSavings || 0);
  const appliedDiscount = safeParsePrice(calculationsData.appliedDiscount || 0);
  const splitPaymentAmount = safeParsePrice(calculationsData.splitPaymentAmount || 0);
  const partPaymentPercentage = calculationsData.partPaymentPercentage || 25;
  const loyalty = calculationsData.loyalty;

  const isServiceOffline = React.useMemo(() => {
    return checkServiceOffline(settings as any, serverTimeOffset);
  }, [settings, serverTimeOffset]);




  const maxDeliveryTime = calculationsData?.maxDeliveryTime || '15 mins';

  const [selectedAddress, setSelectedAddress] = React.useState<Jobsite | null>(
    deliveryAddress || (user?.jobsites && user.jobsites.length > 0 ? user.jobsites[0] : null)
  );
  const [showLoyaltyModal, setShowLoyaltyModal] = React.useState(false);

  React.useEffect(() => {
    if (deliveryAddress) {
      setSelectedAddress(deliveryAddress);
    }
  }, [deliveryAddress]);

  React.useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const { data } = await api.get('/api/cart/coupons');
        if (data.success) {
          setAvailableCoupons(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch coupons:', err);
      }
    };
    fetchCoupons();
  }, []);

  const [hasAnyClaim, setHasAnyClaim] = React.useState(false);

  const fetchLoyaltyInfo = async () => {
    if (!user || !token || !tokenRef.current) return;
    try {
      if (!tokenRef.current) return;

      const [offerRes, claimsRes] = await Promise.all([
        api.get('/api/products/offers'),
        api.get('/api/loyalty/my-claims')
      ]);

      const lOffer = offerRes.data.find((o: LoyaltyOffer) => o.offerType === 'accumulated');
      setLoyaltyOffer(lOffer || null);

      // Check for any existing claim to avoid showing "Not Started"
      setHasAnyClaim(claimsRes.data && claimsRes.data.length > 0);

      // Find the active (in-progress) challenge
      const active = claimsRes.data.find((c: LoyaltyClaim) => !c.isCompleted && new Date(c.expiresAt) > new Date());
      setActiveChallenge(active || null);
    } catch (err) {
      if (__DEV__) console.log('Error fetching loyalty info', err);
    }
  };

  React.useEffect(() => {
    if (user && token && tokenRef.current) fetchLoyaltyInfo();
  }, [user, token]);

  const handleClaimLoyalty = async () => {
    if (!user) {
      setShowLoyaltyModal(false);
      navigation.navigate('Login');
      return;
    }
    if (!loyaltyOffer) return;

    try {
      const { data } = await api.post('/api/loyalty/claim', { offerId: loyaltyOffer._id });
      if (data.success) {
        Toast.show({ type: 'success', text1: 'Challenge Started!', text2: data.message });
        setShowLoyaltyModal(false);
        fetchLoyaltyInfo();
      }
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Challenge Error', text2: err?.response?.data?.message || err.message });
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    const success = await applyCoupon(couponInput.toUpperCase());
    if (success) {
      setCouponInput('');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Invalid Coupon',
        text2: 'This coupon is either invalid or does not meet the requirements.'
      });
    }
  };

  const handleLocationSelect = (
    address: string,
    coords: { latitude: number; longitude: number },
    extraDetails?: { pincode?: string; city?: string; name?: string; contactPhone?: string; jobsite?: Jobsite; isManual?: boolean }
  ) => {
    const manualVal = extraDetails?.isManual !== undefined ? extraDetails.isManual : true;
    setIsManualSelection(manualVal);

    const existingJobsite = extraDetails?.jobsite || findMatchingJobsite(user?.jobsites, coords.latitude, coords.longitude, address);

    const newAddr = existingJobsite || {
      name: extraDetails?.name || 'Selected Location',
      contactPhone: extraDetails?.contactPhone || user?.phoneNumber || '',
      addressText: address,
      pincode: extraDetails?.pincode || '',
      city: extraDetails?.city || '',
      location: {
        type: 'Point',
        coordinates: [coords.longitude, coords.latitude]
      }
    };

    setSelectedAddress(newAddr as Jobsite);
    setDeliveryAddress(newAddr);
  };

  const getOrderPayload = (method: string, paymentRef: string | null = null, paidAmount: number = 0) => {
    return {
      items: cart.map((item: CartItem) => ({
        productId: item.parentProductId || item.productId || item._id || item.id,
        productName: item.name,
        imageUrl: item.imageUrl || item.image,
        quantity: item.quantity,
        price: safeParsePrice(item.price),
        mrp: safeParsePrice(item.mrp || item.price),
        taxRate: item.gst || 18,
        selectedVariant: item.selectedVariant || '',
        deliveryTime: item.deliveryTime,
        totalWeight: (item.weight || 0) * item.quantity,
        totalVolume: (item.volume || 0) * item.quantity,
        selectedVariantData: item
      })),
      totalAmount: totalAmount,
      totalTaxAmount: totalTaxAmount,
      totalBaseAmount: totalBaseAmount,
      deliveryCharge: deliveryCharge,
      platformFee: platformFee,
      vehicleClass: vehicleClass,
      paidAmount: paidAmount,
      pointsRedeemed: redeemedPoints,
      paymentMethod: method,
      paymentReference: paymentRef,
      appliedOffers,
      rewardItems,
      totalSavings,
      deliveryAddress: {
        name: selectedAddress?.name || 'Site',
        fullAddress: selectedAddress?.addressText || selectedAddress?.fullAddress || selectedAddress?.address || 'N/A',
        contactPhone: selectedAddress?.contactPhone || selectedAddress?.contactNumber || user?.phoneNumber || '',
        pincode: selectedAddress?.pincode || '',
        city: selectedAddress?.city || '',
        location: selectedAddress?.location || { type: 'Point', coordinates: [0, 0] }
      },
      couponCode: appliedCouponCode,
      orderSource: 'Mobile App'
    };
  };

  const navigateToTab = (tabName: 'HOME' | 'ORDERS') => {
    if (tabName === 'HOME') {
      navigation.navigate('MainTabs', { screen: 'Home' });
    } else {
      navigation.navigate('MainTabs', { screen: 'Orders' });
    }
  };

  const finalizeOrder = async (method: string, paymentRef: string | null, paidAmount: number) => {
    if (!selectedAddress) {
      Toast.show({ type: 'error', text1: 'Address Required', text2: 'No delivery address selected.' });
      return;
    }
    try {
      setLoading(true);
      const orderData = getOrderPayload(method, paymentRef, paidAmount);

      const { data } = await api.post('/api/orders', orderData);
      clearCart();
      try {
        await refreshProfile();
      } catch (err) {
        if (__DEV__) console.log('Error refreshing profile after order:', err);
      }

      Alert.alert(
        'Order Placed!',
        `Your order #${data._id.substring(data._id.length - 6).toUpperCase()} has been placed successfully.`,
        [{ text: 'View Orders', onPress: () => navigateToTab('ORDERS') }]
      );
    } catch (err: any) {
      if (err.response?.status === 403 && (err.response?.data?.message?.toLowerCase().includes('offline') || err.response?.data?.message?.toLowerCase().includes('9 am'))) {
        // If the backend says we are offline, force an alert and maybe navigate back
        Alert.alert(
          "Service Offline",
          err.response.data.message,
          [{ text: 'OK', onPress: () => navigateToTab('HOME') }]
        );
      } else {
        console.error(err);
        Toast.show({ type: 'error', text1: 'Checkout Failed', text2: err?.response?.data?.message || err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const startRazorpayPayment = async (method: 'Online' | 'Split') => {
    Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'Online payments are disabled in B2B.' });
  };

  const handlePlaceOrder = async (method: string) => {

    if (!selectedAddress || !(selectedAddress.addressText || selectedAddress.address)) {
      Toast.show({ type: 'error', text1: 'Address Required', text2: 'Please select or add a delivery address to proceed.' });
      return;
    }



    // Serviceability Check before placing order
    try {
      setLoading(true);
      let lat = 0, lng = 0;
      if (selectedAddress.location && selectedAddress.location.coordinates) {
        lng = selectedAddress.location.coordinates[0];
        lat = selectedAddress.location.coordinates[1];
      } else if (selectedAddress.coordinates) {
        lat = (selectedAddress.coordinates as any).latitude;
        lng = (selectedAddress.coordinates as any).longitude;
      }

      if (!lat || !lng) {
        Alert.alert('Location Missing', 'Your selected address is missing GPS coordinates. Please re-select your address.');
        setLoading(false);
        return;
      }

      const { data } = await api.post('/api/location/check-coordinates', { lat, lng });
      if (!data.serviceable) {
        Alert.alert(
          'Not Serviceable',
          "We don't deliver to this area yet. Please select a different location to proceed.",
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('[Checkout] Serviceability check failed:', err);
      // If we can't verify, it's safer to block the order than to allow a non-serviceable one
      Alert.alert('Error', 'Could not verify delivery serviceability. Please try again.');
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }

    const hasOnDemand = cart.some(item => item.deliveryTime === 'On Demand');
    if (hasOnDemand) {
      Alert.alert('On Demand Items', 'Some items in your cart are only available on demand. Please remove them to proceed with online buying.');
      return;
    }

    if (method === 'COD') {
      const isStaticVendor = Boolean(process.env.EXPO_PUBLIC_STATIC_VENDOR_PHONE && user?.phoneNumber === process.env.EXPO_PUBLIC_STATIC_VENDOR_PHONE);
      if (!isStaticVendor && settings && settings.isCodEnabled === false) {
        Alert.alert('Not Available', 'Cash on Delivery is currently not available.');
        return;
      }
      await finalizeOrder('COD', null, 0);
    } else if (method === 'Split') {
      setCountdown(10);
      setSplitModalVisible(true);
    } else {
      await startRazorpayPayment('Online');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSubtitle}>SECURE ORDER</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {isServiceOffline && (
        <OfflineBanner message={settings?.offlineMessage || "We are currently offline. Please check back later."} />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="basket-outline" size={20} color={Colors.black} />
            <Text style={styles.sectionHeaderText}>CHECKOUT SUMMARY</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.timerIconBox}>
                <Ionicons name="time-outline" size={20} color={Colors.black} />
              </View>
              <View>
                <Text style={styles.infoTitle}>Delivery in {maxDeliveryTime}</Text>
                <Text style={styles.infoSubtitle}>Shipment of {cart.length} Item{cart.length > 1 ? 's' : ''}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.userIconBox}>
                <Ionicons name="person-outline" size={20} color={Colors.black} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelSmall}>Order for</Text>
                <Text style={styles.infoTitle}>{user?.fullName || 'New User'}</Text>
                <Text style={styles.infoTitleBold}>{user?.phoneNumber || 'XXXXXXXXXX'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.locIconBox}>
                <Ionicons name="location-outline" size={20} color={selectedAddress ? Colors.text.warning : Colors.status.errorDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelSmall}>
                  {selectedAddress?.name ? `Delivering to ${selectedAddress.name}` : 'Delivery Address'}
                </Text>
                <Text style={[styles.addressText, (!selectedAddress || !(selectedAddress.addressText || selectedAddress.address)) && { color: Colors.status.errorDeep }]}>
                  {selectedAddress && (selectedAddress.addressText || selectedAddress.address)
                    ? (selectedAddress.addressText || selectedAddress.address)
                    : 'Please select or add a delivery address to continue.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLocationModalVisible(true)}>
                <Text style={[styles.changeText, !selectedAddress && { color: Colors.status.info }]}>
                  {selectedAddress ? 'Change' : 'Add New'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.policyContainer}>
            <TouchableOpacity
              style={styles.policyRow}
              onPress={() => setShowCancellationPolicy(!showCancellationPolicy)}
            >
              <Text style={styles.policyText}>Cancellation policy</Text>
              <Ionicons name={showCancellationPolicy ? "chevron-up" : "chevron-down"} size={20} color={Colors.text.muted} />
            </TouchableOpacity>
            {showCancellationPolicy && (
              <View style={styles.policyContent}>
                <Text style={styles.policyContentText}>
                  Orders cannot be cancelled once dispatched. For manufacturing defects, items must be inspected at the time of delivery.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="ticket-percent-outline" size={20} color={Colors.black} style={{ marginRight: 8 }} />
            <Text style={styles.sectionHeaderText}>COUPONS & OFFERS</Text>
          </View>

          {!appliedCouponCode ? (
            <View style={styles.infoCard}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: Colors.white,
                    borderWidth: 1.5,
                    borderColor: Colors.border.medium,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    height: 46,
                    fontSize: 14,
                    color: Colors.black,
                    fontWeight: '700',
                  }}
                  placeholder="ENTER COUPON CODE"
                  placeholderTextColor={Colors.text.muted}
                  value={couponInput}
                  onChangeText={(v) => setCouponInput(v.toUpperCase())}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.primary,
                    paddingHorizontal: 20,
                    height: 46,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 10,
                  }}
                  onPress={handleApplyCoupon}
                  disabled={!couponInput.trim()}
                >
                  <Text style={{ fontSize: 14, fontWeight: '900', color: Colors.black }}>Apply</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}
                onPress={() => setCouponsModalVisible(true)}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.status.info, marginRight: 4 }}>
                  View Available Coupons
                </Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.status.info} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.infoCard, { backgroundColor: '#F0FDF4', borderColor: '#22C55E', borderWidth: 1, borderStyle: 'dashed' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#166534' }}>{appliedCouponCode} APPLIED!</Text>
                  <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700', marginTop: 2 }}>
                    {calculations?.appliedCoupon?.discountType === 'free_delivery'
                      ? 'FREE DELIVERY APPLIED'
                      : `Savings: ₹${calculations?.appliedCoupon?.discountAmount || 0}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeCoupon()}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#EF4444' }}>REMOVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── WALLET POINTS REDEMPTION ── */}
          {user?.isAffiliate && pointsBalance > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="link-variant" size={20} color={Colors.black} style={{ marginRight: 8 }} />
                <Text style={styles.sectionHeaderText}>WALLET POINTS</Text>
              </View>

              {redeemedPoints === 0 ? (
                <View style={styles.infoCard}>
                  <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600', marginBottom: 12 }}>
                    You have <Text style={{ fontWeight: '900', color: Colors.black }}>₹{pointsBalance.toFixed(2)}</Text> worth of affiliate wallet points available.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      style={{
                        flex: 1,
                        backgroundColor: Colors.white,
                        borderWidth: 1.5,
                        borderColor: Colors.border.medium,
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        height: 46,
                        fontSize: 14,
                        color: Colors.black,
                        fontWeight: '700',
                      }}
                      placeholder="Points to Redeem"
                      placeholderTextColor={Colors.text.muted}
                      keyboardType="numeric"
                      value={redeemInput}
                      onChangeText={setRedeemInput}
                    />
                    <TouchableOpacity
                      style={{
                        backgroundColor: Colors.primary,
                        paddingHorizontal: 20,
                        height: 46,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: 10,
                      }}
                      onPress={() => {
                        const val = parseFloat(redeemInput);
                        if (isNaN(val) || val <= 0) {
                          Alert.alert('Error', 'Please enter a valid amount of points to redeem');
                          return;
                        }
                        if (val > pointsBalance) {
                          Alert.alert('Error', `You only have ${pointsBalance} points available.`);
                          return;
                        }
                        applyPoints(val);
                        setRedeemInput('');
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '900', color: Colors.black }}>Redeem</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={[styles.infoCard, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6', borderWidth: 1, borderStyle: 'dashed' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#1E40AF' }}>₹{redeemedPoints} POINTS APPLIED!</Text>
                      <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '700', marginTop: 2 }}>
                        Redeeming ₹{redeemedPoints} from your wallet.
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => { removePoints(); setRedeemInput(''); }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#EF4444' }}>REMOVE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}

          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cash-register" size={20} color={Colors.black} />
            <Text style={styles.sectionHeaderText}>BILL SUMMARY</Text>
          </View>

          <View style={styles.billCard}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Item Total (Excl. GST)</Text>
              <Text style={styles.billValue}>₹{totalBaseAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabelSmall}>GST Amount</Text>
              <Text style={styles.billValueSmall}>₹{totalTaxAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Charge (incl GST)</Text>
              <View style={{ alignItems: 'flex-end' }}>
                {deliveryCharge > 0 ? (
                  <Text style={styles.billValue}>₹{deliveryCharge.toFixed(2)}</Text>
                ) : (
                  <Text style={[styles.billValue, { color: Colors.status.successGreen }]}>
                    <Text style={{ textDecorationLine: 'line-through', color: Colors.text.muted, fontSize: 12, fontWeight: 'normal' }}>₹150</Text> FREE
                  </Text>
                )}
                {deliveryCharge > 0 && (
                  <Text style={styles.billSubLabel}>
                    (₹{deliveryChargeBreakup.base.toFixed(2)} + ₹{deliveryChargeBreakup.gst.toFixed(2)} GST)
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Handling Charge (incl GST)</Text>
              <Text style={styles.billValue}>₹{platformFee.toFixed(2)}</Text>
            </View>



            {appliedDiscount - (redeemedPoints ?? 0) > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: Colors.status.successGreen }]}>Offer Discount</Text>
                <Text style={[styles.billValue, { color: Colors.status.successGreen }]}>-₹{(appliedDiscount - (redeemedPoints ?? 0)).toFixed(2)}</Text>
              </View>
            )}

            {(redeemedPoints ?? 0) > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Points Redeemed</Text>
                <Text style={styles.billValue}>-₹{Number(redeemedPoints).toFixed(2)}</Text>
              </View>
            )}

            {rewardItems.length > 0 && (
              <View style={styles.rewardContainer}>
                <Text style={styles.rewardTitle}>Free Rewards Unlocked:</Text>
                {rewardItems.map((item: any, index: number) => (
                  <View key={index} style={styles.rewardRow}>
                    <MaterialCommunityIcons name="gift" size={14} color="#059669" />
                    <Text style={styles.rewardText}>{String(item)}</Text>
                  </View>
                ))}
              </View>
            )}

            {loyalty && loyalty.targetAmount > 0 && (
              <>
                <TouchableOpacity
                  style={styles.loyaltyProgressBox}
                  onPress={() => setShowLoyaltyModal(true)}
                >
                  <View style={styles.loyaltyHeader}>
                    <Text style={styles.loyaltyLabel}>LOYALTY PROGRESS</Text>
                    <Text style={styles.loyaltyPercent}>
                      {((loyalty.combinedTotal / loyalty.targetAmount) * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(100, (loyalty.combinedTotal / loyalty.targetAmount) * 100)}%` }]} />
                  </View>
                  <Text style={styles.loyaltyHint}>
                    Spend <Text style={{ fontWeight: '900' }}>₹{Math.max(0, loyalty.targetAmount - loyalty.combinedTotal).toLocaleString()}</Text> more for <Text style={{ fontWeight: '900' }}>Free Chimney & Hob!</Text>
                  </Text>
                </TouchableOpacity>

                {!hasAnyClaim && loyaltyOffer && (
                  <View style={styles.claimContainer}>
                    <View style={styles.claimInfo}>
                      <Ionicons name="gift-outline" size={20} color="#92400E" />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.claimTitle}>Challenge Not Started</Text>
                        <Text style={styles.claimDesc}>Claim now to start tracking your rewards!</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.claimInlineBtn}
                      onPress={() => setShowLoyaltyModal(true)}
                    >
                      <Text style={styles.claimInlineBtnText}>CLAIM</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.billRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* {totalSavings > 0 && (
            <View style={styles.savingsBanner}>
              <Text style={styles.savingsText}>Your total savings</Text>
              <Text style={styles.savingsAmount}>₹{totalSavings.toFixed(2)}</Text>
            </View>
          )} */}

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {settings?.isFullPaymentEnabled !== false && (
          <TouchableOpacity
            style={[styles.bottomPayBtn, (loading || calculationsLoading || !settings || isServiceOffline) && { opacity: 0.7 }]}
            onPress={() => handlePlaceOrder('Online')}
            disabled={!!(loading || calculationsLoading || !settings || isServiceOffline)}
          >
            <Text style={styles.bottomBtnPrice}>₹{totalAmount.toFixed(2)}</Text>
            <Text style={styles.bottomBtnSub}>100% NOW</Text>
            <Text style={styles.bottomBtnAction}>Pay Online</Text>
          </TouchableOpacity>
        )}

        {settings?.isPartPaymentEnabled !== false && (
          <TouchableOpacity
            style={[styles.bottomSplitBtn, (loading || calculationsLoading || !settings || isServiceOffline) && { opacity: 0.7 }]}
            onPress={() => handlePlaceOrder('Split')}
            disabled={!!(loading || calculationsLoading || !settings || isServiceOffline)}
          >
            <Text style={styles.bottomBtnPriceDark}>₹{splitPaymentAmount.toFixed(2)}</Text>
            <Text style={styles.bottomBtnSubDark}>{partPaymentPercentage}% SPLIT</Text>
            <Text style={styles.bottomBtnActionDark}>Split Payment</Text>
          </TouchableOpacity>
        )}

        {(settings?.isCodEnabled === true || (Boolean(process.env.EXPO_PUBLIC_STATIC_VENDOR_PHONE) && user?.phoneNumber === process.env.EXPO_PUBLIC_STATIC_VENDOR_PHONE)) && (
          <TouchableOpacity
            style={[styles.bottomCodBtn, (loading || calculationsLoading || !settings || isServiceOffline) && { opacity: 0.7 }]}
            onPress={() => handlePlaceOrder('COD')}
            disabled={!!(loading || calculationsLoading || !settings || isServiceOffline)}
          >
            <Text style={styles.bottomBtnPrice}>₹{totalAmount.toFixed(2)}</Text>
            <Text style={styles.bottomBtnSub}>ON DELIVERY</Text>
            <Text style={styles.bottomBtnAction}>COD</Text>
          </TouchableOpacity>
        )}
      </View>




      <Modal visible={showLoyaltyModal} transparent animationType="fade">
        <View style={styles.loyaltyModalOverlay}>
          <View style={styles.loyaltyModalContent}>
            <View style={styles.loyaltyModalHeader}>
              <View style={styles.loyaltyIconCircle}>
                <MaterialCommunityIcons name="gift" size={32} color={Colors.black} />
              </View>
              <TouchableOpacity style={styles.loyaltyCloseBtn} onPress={() => setShowLoyaltyModal(false)}>
                <Ionicons name="close" size={24} color={Colors.black} />
              </TouchableOpacity>
              <Text style={styles.loyaltyModalTitle}>The 5L Challenge</Text>
              <Text style={styles.loyaltyModalSub}>Exclusive Rewards for High Volume Partners</Text>
            </View>
            <View style={styles.loyaltyModalBody}>
              <View style={styles.loyaltyDetailRow}>
                <Ionicons name="chevron-forward" size={18} color="#F5D100" />
                <Text style={styles.loyaltyDetailText}>Purchase materials worth <Text style={{ fontWeight: '900' }}>₹5,00,000</Text> within <Text style={{ fontWeight: '900' }}>45 days</Text>.</Text>
              </View>
              <View style={styles.loyaltyDetailRow}>
                <Ionicons name="chevron-forward" size={18} color="#F5D100" />
                <Text style={styles.loyaltyDetailText}>Once the target is hit, you unlock a <Text style={{ fontWeight: '900' }}>Branded Chimney</Text> and a <Text style={{ fontWeight: '900' }}>4 Burner Hob</Text> for FREE!</Text>
              </View>
              <View style={styles.loyaltyDetailRow}>
                <Ionicons name="chevron-forward" size={18} color="#F5D100" />
                <Text style={styles.loyaltyDetailText}>Your progress is tracked automatically across all orders.</Text>
              </View>

              <View style={styles.loyaltyDisclaimer}>
                <Text style={styles.loyaltyDisclaimerText}>*Delivery of reward items within 15 days of qualification.</Text>
              </View>

              <TouchableOpacity
                style={styles.loyaltyClaimBtn}
                onPress={hasAnyClaim ? () => setShowLoyaltyModal(false) : handleClaimLoyalty}
              >
                <Text style={styles.loyaltyClaimBtnText}>
                  {hasAnyClaim ? 'Got it!' : 'Claim This Offer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelectAddress={handleLocationSelect}
      />

      <Modal visible={couponsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.couponsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Available Coupons</Text>
              <TouchableOpacity onPress={() => setCouponsModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.black} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginTop: 20 }}>
              {availableCoupons.length === 0 ? (
                <Text style={styles.emptyText}>No coupons available at this moment.</Text>
              ) : (
                availableCoupons.map((coupon) => {
                  const subTotal = (totalBaseAmount || 0) + (totalTaxAmount || 0);
                  const isEligible = subTotal >= coupon.minPurchaseAmount;

                  return (
                    <TouchableOpacity
                      key={coupon._id}
                      style={[styles.couponTicket, !isEligible && { opacity: 0.6 }]}
                      onPress={() => {
                        if (isEligible) {
                          applyCoupon(coupon.code);
                          setCouponsModalVisible(false);
                        }
                      }}
                      disabled={!isEligible}
                    >
                      <View style={styles.ticketLeft}>
                        <View style={styles.couponBadge}>
                          <Text style={styles.couponBadgeText}>{coupon.code}</Text>
                        </View>
                        <Text style={styles.couponValue}>
                          {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` :
                            coupon.discountType === 'flat' ? `₹${coupon.discountValue} OFF` : 'FREE DELIVERY'}
                        </Text>
                        <Text style={styles.couponDesc}>{coupon.description}</Text>
                        <Text style={{ fontSize: 9, color: Colors.text.muted, marginTop: 2 }}>
                          Min Order: ₹{coupon.minPurchaseAmount} {coupon.expiryDate ? `• Exp: ${new Date(coupon.expiryDate).toLocaleDateString()}` : ''}
                        </Text>
                      </View>
                      <View style={styles.ticketRight}>
                        {isEligible ? (
                          <Text style={styles.applyText}>APPLY</Text>
                        ) : (
                          <View>
                            <Text style={styles.lockedText}>LOCKED</Text>
                            <Text style={styles.lockedSub}>Add ₹{(coupon.minPurchaseAmount - subTotal).toFixed(0)}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={splitModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.splitModalContent}>
            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{countdown}</Text>
            </View>
            <Text style={styles.splitTitle}>Split Payment Terms</Text>
            <Text style={styles.splitText}>
              If the item is not received at delivery for any reason apart from defective/broken product, the refund will be made after adjusting for delivery charges shown at time of placing order.
            </Text>
            <Text style={styles.redirectText}>Redirecting to payment gateway...</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSplitModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F7FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.black },
  headerSubtitle: { fontSize: 10, color: Colors.text.muted, fontWeight: '700', letterSpacing: 0.5 },

  scrollView: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: '900', color: Colors.text.primary, marginLeft: 8 },

  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  timerIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.background.secondary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  userIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.background.secondary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  locIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background.warning, justifyContent: 'center', alignItems: 'center', marginRight: 15 },

  infoTitle: { fontSize: 15, fontWeight: '800', color: Colors.black },
  infoTitleBold: { fontSize: 16, fontWeight: '900', color: Colors.black },
  infoSubtitle: { fontSize: 12, color: Colors.text.muted, marginTop: 2 },
  labelSmall: { fontSize: 11, fontWeight: '700', color: Colors.text.muted, marginBottom: 2 },
  addressText: { fontSize: 12, fontWeight: '700', color: Colors.text.primary, lineHeight: 18 },
  changeText: { fontSize: 13, fontWeight: '800', color: Colors.status.successGreen },

  policyContainer: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  policyText: { fontSize: 14, fontWeight: '700', color: Colors.text.muted },
  policyContent: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: Colors.white,
  },
  policyContentText: {
    fontSize: 13,
    color: Colors.text.muted,
    lineHeight: 20,
    fontWeight: '500',
  },

  billCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 24,
  },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  billLabel: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  billLabelSmall: { fontSize: 13, color: Colors.text.muted },
  billSubLabel: { fontSize: 11, color: Colors.text.muted, marginTop: 2 },
  billValue: { fontSize: 14, fontWeight: '800', color: Colors.black },
  billValueSmall: { fontSize: 13, fontWeight: '700', color: Colors.black },
  divider: { height: 1, backgroundColor: Colors.border.light, borderStyle: 'dashed', marginVertical: 15, borderWidth: 0.5, borderColor: Colors.border.dark },
  grandTotalLabel: { fontSize: 18, fontWeight: '900', color: Colors.black },
  grandTotalValue: { fontSize: 18, fontWeight: '900', color: Colors.black },
  grandTotalStrike: { fontSize: 12, fontWeight: '700', color: Colors.text.muted, textDecorationLine: 'line-through', marginBottom: 2 },

  // ── Points redemption styles ───────────────────────────────────────────
  pointsCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  pointsBalanceRow: { flexDirection: 'row', alignItems: 'center' },
  pointsIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pointsBalanceLabel: { fontSize: 11, fontWeight: '700', color: Colors.text.muted },
  pointsBalanceValue: { fontSize: 13, fontWeight: '900', color: Colors.text.primary },
  redeemToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  redeemToggleBtnText: { fontSize: 12, fontWeight: '900', color: Colors.black },
  redeemInputPanel: {
    marginTop: 14,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 12,
  },
  redeemInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  redeemRupee: { fontSize: 22, fontWeight: '900', color: Colors.text.muted, marginRight: 4 },
  redeemInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text.primary,
    paddingVertical: 4,
  },
  redeemApplyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.black,
    borderRadius: 10,
  },
  redeemApplyText: { fontSize: 12, fontWeight: '900', color: Colors.primary },
  quickRedeemRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  quickRedeemChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  quickRedeemChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickRedeemText: { fontSize: 12, fontWeight: '800', color: Colors.text.secondary },
  quickRedeemTextActive: { color: Colors.black },
  redeemNote: { fontSize: 10, color: Colors.text.muted, fontWeight: '600', marginTop: 2 },
  redeemAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  redeemAppliedText: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.text.success },
  redeemRemoveText: { fontSize: 12, fontWeight: '900', color: Colors.status.error },

  // Loyalty & Rewards
  loyaltyProgressBox: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loyaltyLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
  },
  loyaltyPercent: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.status.info,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.status.info,
  },
  loyaltyHint: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  rewardContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  rewardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: 8,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ui.purple,
    marginLeft: 6,
  },

  paymentSection: { paddingHorizontal: 16 },
  savingsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background.success,
    borderColor: Colors.status.successGreen,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  savingsText: { fontSize: 14, fontWeight: '700', color: Colors.text.success },
  savingsAmount: { fontSize: 16, fontWeight: '900', color: Colors.text.success },

  fullPayBtn: {
    backgroundColor: Colors.status.successGreen,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: Colors.status.successGreen,
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  fullPayText: { color: Colors.white, fontSize: 15, fontWeight: '900' },

  splitPayBtn: {
    backgroundColor: Colors.border.medium,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  splitPayText: { color: Colors.black, fontSize: 15, fontWeight: '800' },

  codPayBtn: {
    backgroundColor: Colors.black,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
  },
  codPayText: { color: Colors.primary, fontSize: 15, fontWeight: '900' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 30,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  bottomPayBtn: {
    backgroundColor: Colors.status.successGreen,
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bottomBtnPrice: { fontSize: 14, fontWeight: '900', color: Colors.white },
  bottomBtnSub: { fontSize: 8, fontWeight: '800', color: Colors.white, opacity: 0.9 },
  bottomBtnAction: { fontSize: 12, fontWeight: '900', color: Colors.white, marginTop: 2 },

  bottomSplitBtn: {
    backgroundColor: '#EFF6FF',
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bottomBtnPriceDark: { fontSize: 14, fontWeight: '900', color: Colors.text.primary },
  bottomBtnSubDark: { fontSize: 8, fontWeight: '800', color: Colors.text.primary },
  bottomBtnActionDark: { fontSize: 12, fontWeight: '900', color: Colors.text.primary, marginTop: 2 },

  bottomCodBtn: {
    backgroundColor: Colors.black,
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.ui.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '85%',
  },
  timerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.black,
  },
  splitTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.black,
    marginBottom: 10,
  },
  splitText: {
    fontSize: 14,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  redirectText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.status.successGreen,
    marginBottom: 20,
  },
  cancelBtn: {
    padding: 12,
    width: '100%',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.border.light,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.muted,
  },
  // Coupon Styles
  couponInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  couponInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  inputPlaceholder: { fontSize: 10, color: Colors.text.muted, fontWeight: '700' },
  actualInput: { fontSize: 14, fontWeight: '900', color: Colors.black },
  applyBtn: { marginLeft: 12, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  applyBtnText: { fontSize: 13, fontWeight: '900', color: Colors.black },
  viewAllCoupons: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  viewAllText: { fontSize: 13, fontWeight: '800', color: Colors.status.info, marginRight: 4 },

  couponsModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    height: '70%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: Colors.black },
  emptyText: { textAlign: 'center', padding: 40, color: Colors.text.muted, fontWeight: '700' },

  couponTicket: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    height: 100,
  },
  ticketLeft: { flex: 3, padding: 12, justifyContent: 'center' },
  ticketRight: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8
  },
  couponBadge: {
    backgroundColor: '#FEF9C3',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FACC15',
    borderStyle: 'dashed',
    marginBottom: 6
  },
  couponBadgeText: { fontSize: 12, fontWeight: '900', color: '#854D0E' },
  couponValue: { fontSize: 16, fontWeight: '900', color: Colors.black },
  couponDesc: { fontSize: 11, color: Colors.text.muted, marginTop: 4, fontWeight: '600' },
  applyText: { fontSize: 14, fontWeight: '900', color: Colors.status.successGreen },
  lockedText: { fontSize: 12, fontWeight: '900', color: Colors.status.errorDeep, textAlign: 'center' },
  lockedSub: { fontSize: 8, color: Colors.text.muted, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  loyaltyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loyaltyModalContent: {
    backgroundColor: Colors.white,
    width: '90%',
    borderRadius: 30,
    overflow: 'hidden',
  },
  loyaltyModalHeader: {
    backgroundColor: Colors.primary,
    padding: 30,
    alignItems: 'center',
  },
  loyaltyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loyaltyCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 5,
  },
  loyaltyModalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.black,
    marginBottom: 8,
  },
  loyaltyModalSub: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
  },
  loyaltyModalBody: {
    padding: 25,
  },
  loyaltyDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  loyaltyDetailText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 10,
    lineHeight: 20,
  },
  loyaltyDisclaimer: {
    backgroundColor: '#FFFBEB',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 25,
  },
  loyaltyDisclaimerText: {
    fontSize: 11,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '700',
  },
  loyaltyClaimBtn: {
    backgroundColor: Colors.black,
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  loyaltyClaimBtnText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  claimContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -5,
    marginBottom: 15,
  },
  claimInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  claimTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  claimDesc: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '600',
  },
  claimInlineBtn: {
    backgroundColor: Colors.black,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  claimInlineBtnText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },

  installationBreakupContainer: {
    paddingLeft: 10,
    paddingBottom: 8,
    borderLeftWidth: 1.5,
    borderLeftColor: Colors.border.medium,
    marginLeft: 4,
    marginBottom: 8,
    marginTop: 4,
  },
  breakupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  breakupLabel: {
    fontSize: 11,
    color: Colors.text.muted,
    fontWeight: '600',
  },
  breakupValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.primary,
  },
});
