import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import api from '../services/api';
import { safeParsePrice } from '../utils/priceUtils';
import { Jobsite, useAuth } from './AuthContext';

export type CartItem = {
  id: string;
  _id?: string;
  productId?: string;
  parentProductId?: string;
  name: string;
  price: number; // Inclusive of GST
  image: string;
  imageUrl?: string;
  quantity: number;
  material?: string;
  finish?: string;
  mrp?: number;
  gst?: number;
  logisticsCategory?: string;
  weight?: number;
  volume?: number;
  selectedVariant?: string;
  bulkPricing?: { minQty: number; discount: number }[];
  deliveryTime?: string;
  brand?: string;
};

export type CartCalculations = {
  totalAmount: number;
  subTotal: number;
  totalBaseAmount: number;
  totalTaxAmount: number;
  platformFee: number;
  deliveryCharge: number;
  deliveryChargeBreakup: {
    base: number;
    gst: number;
  };
  totalWeight: number;
  totalVolume: number;
  vehicleClass: string;
  appliedDiscount: number;
  appliedOffers: string[];
  rewardItems: string[];
  totalSavings: number;
  splitPaymentAmount: number;
  partPaymentPercentage: number;
  appliedCoupon?: {
    code: string;
    discountAmount: number;
    discountType?: string;
  } | null;
  loyalty?: {
    totalSpent: number;
    currentOrder: number;
    combinedTotal: number;
    targetAmount: number;
  };
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (product: any, quantity?: number) => boolean;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  calculations: CartCalculations | null;
  loading: boolean;
  deliveryAddress: Jobsite | null;
  setDeliveryAddress: (address: Jobsite | null) => void;
  isManualSelection: boolean;
  setIsManualSelection: (isManual: boolean) => void;
  clearCart: () => void;
  refreshCalculations: () => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  appliedCouponCode: string | null;
  pointsToRedeem: number;
  applyPoints: (points: number) => void;
  removePoints: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = '@matall_vendor_cart';
const ADDRESS_STORAGE_KEY = '@matall_vendor_delivery_address';
const MANUAL_SELECTION_STORAGE_KEY = '@matall_vendor_is_manual_selection';

const INITIAL_CALCULATIONS: CartCalculations = {
  totalAmount: 0,
  subTotal: 0,
  totalBaseAmount: 0,
  totalTaxAmount: 0,
  platformFee: 0,
  deliveryCharge: 0,
  deliveryChargeBreakup: { base: 0, gst: 0 },
  totalWeight: 0,
  totalVolume: 0,
  vehicleClass: 'Bike',
  appliedDiscount: 0,
  appliedOffers: [],
  rewardItems: [],
  totalSavings: 0,
  splitPaymentAmount: 0,
  partPaymentPercentage: 25,
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddressState] = useState<any | null>(null);
  const [isManualSelection, setIsManualSelectionState] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [calculations, setCalculations] = useState<CartCalculations | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  const { user, token } = useAuth();

  // Load cart and address from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (storedCart) {
          setCart(JSON.parse(storedCart));
        }
        const storedAddress = await AsyncStorage.getItem(ADDRESS_STORAGE_KEY);
        if (storedAddress) {
          setDeliveryAddressState(JSON.parse(storedAddress));
        }
        const storedManual = await AsyncStorage.getItem(MANUAL_SELECTION_STORAGE_KEY);
        if (storedManual) {
          setIsManualSelectionState(storedManual === 'true');
        }
        const storedCoupon = await AsyncStorage.getItem('@matall_vendor_coupon_code');
        if (storedCoupon) {
          setAppliedCouponCode(storedCoupon);
        }
      } catch (e) {
        console.error('[CartContext] Failed to load data', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // Clear cart and address on logout
  useEffect(() => {
    if (!user && isLoaded) {
      setCart([]);
      setAppliedCouponCode(null);
      setPointsToRedeem(0);
      setDeliveryAddressState(null);
      setIsManualSelectionState(false);
      AsyncStorage.multiRemove([
        CART_STORAGE_KEY,
        '@matall_vendor_coupon_code',
        ADDRESS_STORAGE_KEY,
        MANUAL_SELECTION_STORAGE_KEY
      ]).catch(e =>
        console.error('[CartContext] Failed to clear storage on logout', e)
      );
    }
  }, [user?._id, isLoaded]);

  const setDeliveryAddress = async (address: any | null) => {
    setDeliveryAddressState(address);
    try {
      if (address) {
        await AsyncStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(address));
      } else {
        await AsyncStorage.removeItem(ADDRESS_STORAGE_KEY);
      }
    } catch (e) {
      console.error('[CartContext] Failed to save address', e);
    }
  };

  const setIsManualSelection = async (isManual: boolean) => {
    setIsManualSelectionState(isManual);
    try {
      await AsyncStorage.setItem(MANUAL_SELECTION_STORAGE_KEY, isManual ? 'true' : 'false');
    } catch (e) {
      console.error('[CartContext] Failed to save manual selection flag', e);
    }
  };

  // Save cart to storage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)).catch(e =>
        console.error('[CartContext] Failed to save cart', e)
      );

      // SYNC WITH BACKEND (Debounced)
      if (token) {
        const syncTimeout = setTimeout(async () => {
          try {
            await api.post('/api/cart/sync', {
              items: cart.map(item => ({
                productId: (item as any).product?._id || item.productId || item._id,
                quantity: item.quantity,
                selectedVariant: item.selectedVariant
              }))
            }).catch(err => {
              console.log('[CartContext] Remote sync failed/skipped in Vendor App');
            });
          } catch (err) {
            console.error('[CartContext] Failed to sync cart:', err);
          }
        }, 2000);
        return () => clearTimeout(syncTimeout);
      }
    }
  }, [cart, isLoaded, token]);

  // LOAD FROM BACKEND ON LOGIN
  useEffect(() => {
    if (token && isLoaded) {
      const loadRemoteCart = async () => {
        try {
          const { data } = await api.get('/api/cart').catch(err => {
            console.log('[CartContext] Remote load cart failed/skipped in Vendor App');
            return { data: { success: false } };
          });
          if (data.success && data.cart && data.cart.length > 0) {
            const remoteCart = data.cart
              .filter((item: any) => item && item.productId)
              .map((item: any) => ({
                ...item.productId,
                id: item.productId._id, // Explicitly set id for Mobile UI compatibility
                productId: item.productId._id,
                quantity: item.quantity,
                selectedVariant: item.selectedVariant
              }));

            setCart(remoteCart);
          }
        } catch (err) {
          console.error('[CartContext] Failed to load remote cart:', err);
        }
      };
      loadRemoteCart();
    }
  }, [token, isLoaded]);

  const refreshCalculations = useCallback(async () => {
    if (cart.length === 0) {
      setCalculations(INITIAL_CALCULATIONS);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        items: cart.map(item => ({
          productId: item.parentProductId || item.productId || item._id || item.id,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant,
          price: item.price, // Send price for guest/fallback calculation
        })),
        address: deliveryAddress,
        couponCode: appliedCouponCode,
        pointsToRedeem: pointsToRedeem
      };

      if (__DEV__) console.log('🛒 [CartContext] Requesting calculation for:', payload.items.length, 'items');

      const { data } = await api.post('/api/cart/calculate', payload).catch(err => {
        if (__DEV__) console.warn('[CartContext] Calculation API failed, using local fallback', err.message);
        // Local fallback calculation
        const subtotal = cart.reduce((sum, item) => sum + (safeParsePrice(item.price) * item.quantity), 0);
        const finalTotal = Math.max(0, subtotal - pointsToRedeem);
        const splitAmount = Math.round(finalTotal * 0.25);
        return {
          data: {
            success: true,
            data: {
              ...INITIAL_CALCULATIONS,
              subtotal,
              totalAmount: finalTotal,
              appliedDiscount: pointsToRedeem,
              effectivePointsRedeemed: pointsToRedeem,
              splitPaymentAmount: splitAmount
            }
          }
        };
      });

      if (__DEV__) console.log('🧾 [CartContext] Calculation Response:', JSON.stringify(data, null, 2));

      const calcResult = (data && data.success && data.data) ? data.data : data;

      if (calcResult && typeof calcResult === 'object') {
        console.log('🛒 [Cart Frontend] Cart Summary:', {
          totalAmount: calcResult.totalAmount,
          totalBaseAmount: calcResult.totalBaseAmount,
          totalTaxAmount: calcResult.totalTaxAmount,
          deliveryCharge: calcResult.deliveryCharge,
          platformFee: calcResult.platformFee,
          itemsCount: cart.length
        });
        setCalculations(calcResult);
      }
    } catch (error) {
      console.error('[CartContext] refreshCalculations failed', error);
    } finally {
      setLoading(false);
    }
  }, [cart, deliveryAddress, appliedCouponCode, pointsToRedeem, token]);

  const applyCoupon = async (code: string): Promise<boolean> => {
    if (!token) return false;
    try {
      setLoading(true);
      const payload = {
        items: cart.map(item => ({
          productId: item.parentProductId || item.productId || item._id || item.id,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant
        })),
        couponCode: code,
        pointsToRedeem: pointsToRedeem
      };

      const { data } = await api.post('/api/cart/calculate', payload);
      const calcResult = (data && data.success && data.data) ? data.data : data;

      if (calcResult && calcResult.appliedCoupon) {
        setAppliedCouponCode(code);
        await AsyncStorage.setItem('@matall_vendor_coupon_code', code);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[CartContext] applyCoupon failed', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = async () => {
    setAppliedCouponCode(null);
    await AsyncStorage.removeItem('@matall_vendor_coupon_code');
  };

  const applyPoints = (points: number) => {
    setPointsToRedeem(points);
  };

  const removePoints = () => {
    setPointsToRedeem(0);
  };

  // Refresh calculations whenever cart or points changes
  useEffect(() => {
    if (isLoaded) {
      refreshCalculations();
    }
  }, [cart, isLoaded, refreshCalculations, deliveryAddress, pointsToRedeem]);

  const addToCart = (product: any, quantity: number = 1): boolean => {
    if (product.deliveryTime === 'On Demand' && quantity > 0) {
      Alert.alert('On Demand', 'This product is only available on demand. Please use Request on Demand.');
      return false;
    }

    setCart((prevCart) => {
      const productIdentifier = String(product.productId || product._id || product.id);
      const existingItemIndex = prevCart.findIndex(
        (item) => String(item.productId || item._id || item.id) === productIdentifier &&
          (item.selectedVariant || null) === (product.selectedVariant || null)
      );

      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        const newQty = updatedCart[existingItemIndex].quantity + quantity;
        if (newQty <= 0) {
          updatedCart.splice(existingItemIndex, 1);
        } else {
          updatedCart[existingItemIndex].quantity = newQty;
        }
        return updatedCart;
      }

      return [...prevCart, { ...product, quantity }];
    });
    return true;
  };



  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => String(item.id || item._id || item.productId) !== String(id)));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (String(item.id || item._id || item.productId) === String(id)) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const setQuantity = (id: string, quantity: number) => {
    setCart(prev => prev.map(item => {
      if (String(item.id || item._id || item.productId) === String(id)) {
        return { ...item, quantity: Math.max(0, quantity) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => {
    setCart([]);
    setPointsToRedeem(0);
  };

  const contextValue = useMemo(() => ({
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    setQuantity,
    calculations,
    loading,
    deliveryAddress,
    setDeliveryAddress,
    isManualSelection,
    setIsManualSelection,
    clearCart,
    refreshCalculations,
    applyCoupon,
    removeCoupon,
    appliedCouponCode,
    pointsToRedeem,
    applyPoints,
    removePoints
  }), [cart, calculations, loading, deliveryAddress, isManualSelection, refreshCalculations, appliedCouponCode, pointsToRedeem]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
