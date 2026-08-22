import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getFullImageUrl } from '../utils/imageUrl';
import Toast from 'react-native-toast-message';
import QtySelector from './QtySelector';
import { useAuth } from '../context/AuthContext';
import { safeParsePrice } from '../utils/priceUtils';


const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 65;
const FLATLIST_PADDING = 20;
const CARD_MARGINS = 10;
const PRODUCT_WIDTH = (width - SIDEBAR_WIDTH - FLATLIST_PADDING - (CARD_MARGINS * 2)) / 2;

export type ProductCardProps = {
  item: any;
  navigation: any;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: any) => void;
  addToCart: (product: any, quantity?: number) => boolean;
  updateGlobalQty: (id: string, delta: number) => void;
  cart: any[];
  openVariantModal: (product: any) => void;
  horizontal?: boolean;
  setGlobalQty?: (id: string, qty: number) => void;
};

const ProductCard: React.FC<ProductCardProps> = ({
  item,
  navigation,
  isFavorite,
  toggleFavorite,
  addToCart,
  updateGlobalQty,
  cart,
  openVariantModal,
  horizontal = false,
  setGlobalQty
}) => {
  const { user } = useAuth();
  const favorite = isFavorite(String(item._id || item.id));
  const cartQty = cart.find(i => String(i.id) === String(item._id || item.id))?.quantity || 0;

  const brandStr = (item.brand?.name || item.brand || '').toLowerCase();
  const nameStr = (item.name || item.productName || '');
  let displayName = nameStr;
  if (brandStr && nameStr.toLowerCase().startsWith(brandStr)) {
    displayName = nameStr.slice(brandStr.length).trim();
  }

  const firstVariant = item.variants && item.variants.length > 0 ? item.variants[0] : null;

  const currentPrice = safeParsePrice(
    item.pricing?.b2bBuyingPrice ||
    item.b2bBuyingPrice ||
    item.pricing?.matallBuyingPrice ||
    item.matallBuyingPrice ||
    0
  );
  const currentMrp = 0; // Disable MRP and discount display
  
  let unitLabelText = item.unitLabel || 'Standard';
  if (item.variants && item.variants.length > 0) {
    const firstVar = item.variants[0];
    if (firstVar.attributes && Object.keys(firstVar.attributes).length > 0) {
      unitLabelText = Object.values(firstVar.attributes)[0] as string;
    } else if (firstVar.name && firstVar.name !== 'Standard') {
      unitLabelText = firstVar.name.split(',')[0].trim();
    }
  }

  const discount = 0;

  const handleAddToCart = (e: any) => {
    e.stopPropagation();
    if (item.variants && item.variants.length > 1) {
      openVariantModal(item);
    } else {
      const productName = item.name || item.productName || 'Product';
      if (__DEV__) console.log('Product:', item);
      const added = addToCart({
        id: item._id || item.id,
        name: productName,
        price: currentPrice,
        image: item.imageUrl,
        imageUrl: item.imageUrl,
        material: item.material,
        finish: item.finish,
        selectedVariant: 'Standard',
        mrp: currentMrp,
        gst: item.gst || 18,
        logisticsCategory: item.logisticsCategory || 'Light',
        weight: item.inventory?.unitWeight ? item.inventory.unitWeight / 1000 : (item.weight || 0),
        volume: item.volume || 0,
        bulkPricing: item.bulkPricing,
        deliveryTime: item.deliveryTime || '15 mins',
        attributes: {},
        parentProductId: item._id || item.id
      });
      if (added) {
        Toast.show({
          type: 'success',
          text1: 'Added to Cart',
          text2: `${productName} has been added to your cart.`,
          visibilityTime: 2000,
        });
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.productCard, horizontal && styles.horizontalCard]}
      onPress={() => navigation.push('Details', { productId: String(item._id || item.id) })}
    >
      <View style={styles.imageContainer}>
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.wishlistBtn, favorite && styles.wishlistBtnActive]}
          onPress={(e) => {
            e.stopPropagation();
            if (!user) {
              navigation.navigate('Login');
              return;
            }
            const isAdding = !favorite;
            toggleFavorite(item);
            Toast.show({
              type: 'success',
              text1: isAdding ? 'Added to Favourites' : 'Removed from Favourites',
              text2: `${item.name || item.productName} has been ${isAdding ? 'added to' : 'removed from'} your wishlist.`,
              visibilityTime: 2000,
            });
          }}
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={18}
            color={favorite ? "#ef4444" : "#94a3b8"}
          />
        </TouchableOpacity>

        <Image
          source={{ uri: getFullImageUrl(item.imageUrl) }}
          style={styles.productImage}
          contentFit="contain"
          transition={200}
        />

        {item.deliveryTime && (
          <View style={[styles.deliveryBadge, item.deliveryTime === 'On Demand' && styles.deliveryBadgeOnDemand]}>
            <Ionicons name="time-outline" size={12} color={item.deliveryTime === 'On Demand' ? "#000" : "#1e293b"} />
            <Text style={styles.deliveryText}>{item.deliveryTime}</Text>
          </View>
        )}
      </View>

      <View style={styles.productDetails}>
        <View style={styles.listVariantInfoWrapper}>
          <View style={styles.listActionRow}>
            <TouchableOpacity
              style={styles.listUnitInfo}
              disabled={!(item.variants && item.variants.length > 1)}
              onPress={(e) => {
                e.stopPropagation();
                if (item.variants && item.variants.length > 1) {
                  openVariantModal(item);
                }
              }}
            >
              <Text
                style={[styles.unitLabelText, item.variants && item.variants.length > 1 && styles.unitLabelTextClickable]}
                numberOfLines={2}
              >
                {unitLabelText}
              </Text>
              {item.variants && item.variants.length > 1 && (
                <Ionicons name="chevron-down" size={10} color="#16a34a" style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>

            <View style={styles.listAddContainer}>
              {item.deliveryTime === 'On Demand' ? (
                <TouchableOpacity
                  style={styles.listRequestBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    openVariantModal(item);
                  }}
                >
                  <Text style={styles.listRequestBtnText}>REQUEST</Text>
                </TouchableOpacity>
              ) : cartQty > 0 ? (
                <QtySelector
                  quantity={cartQty}
                  onUpdate={(delta) => updateGlobalQty(String(item._id || item.id), delta)}
                  onSet={(val) => setGlobalQty && setGlobalQty(String(item._id || item.id), val)}
                  containerStyle={styles.listQtyControl}
                  btnStyle={styles.listQtyBtn}
                  inputStyle={styles.listQtyVal}
                  iconColor="#fff"
                  iconSize={14}
                />
              ) : (
                <TouchableOpacity
                  style={styles.listAddBtn}
                  onPress={handleAddToCart}
                >
                  <Text style={styles.listAddBtnText}>ADD</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {item.variants && item.variants.length > 1 ? (
            <TouchableOpacity
              style={styles.optionsIndicatorRow}
              onPress={(e) => {
                e.stopPropagation();
                openVariantModal(item);
              }}
            >
              <Text style={styles.optionsText}>{item.variants.length} options</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.optionsPlaceholder} />
          )}
        </View>

        <View style={styles.listPricingSection}>
          <View style={styles.listPriceRow}>
            <Text style={styles.listPrice}>₹{currentPrice.toFixed(2)}</Text>
            {currentMrp > currentPrice && (
              <Text style={styles.listMrp}>₹{currentMrp.toFixed(2)}</Text>
            )}
          </View>
          {firstVariant?.inventory && (firstVariant.inventory.packOf || firstVariant.inventory.soldAs) && (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, marginBottom: 2 }}>
              {firstVariant.inventory.packOf ? (
                <Text style={{ fontSize: 10, color: '#475569', fontWeight: '500' }}>{firstVariant.inventory.packOf}</Text>
              ) : null}
              {firstVariant.inventory.soldAs ? (
                <Text style={{ fontSize: 10, color: '#475569', fontWeight: '500' }}>{firstVariant.inventory.soldAs}</Text>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.listProductNameContainer}>
          <Text style={styles.brandBold} numberOfLines={1}>
            {item.brand?.name || item.brand}
          </Text>
          {item.subCategory && (
            <Text style={styles.listSubcategoryName} numberOfLines={1}>
              {item.subCategory}
            </Text>
          )}
          <Text style={styles.listProductName}>
            {displayName}
          </Text>
        </View>

        <View style={styles.listMetaRow}>
          <View style={styles.listRating}>
            <Ionicons name="star" size={12} color="#facc15" />
            <Text style={styles.ratingVal}>{(item.avgRating || item.rating || 0).toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({item.numReviews || 0})</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productCard: {
    width: PRODUCT_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 330,
  },
  horizontalCard: {
    width: 170,
    marginRight: 12,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#f8fafc',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  productImage: { width: '85%', height: '85%', resizeMode: 'contain' },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 0,
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 5,
  },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  wishlistBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  wishlistBtnActive: { backgroundColor: '#fff' },
  deliveryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  deliveryBadgeOnDemand: {
    backgroundColor: '#facc15',
    borderColor: '#eab308',
  },
  deliveryText: { fontSize: 10, marginLeft: 4, fontWeight: '700', color: '#1e293b' },
  productDetails: { padding: 12, flex: 1 },
  listVariantInfoWrapper: {
    minHeight: 50,
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  listActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listUnitInfo: {
    maxWidth: '55%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    marginRight: 6,
  },
  unitLabelText: { flexShrink: 1, fontSize: 10, fontWeight: '700', color: '#64748b', lineHeight: 12 },
  unitLabelTextClickable: { color: '#16a34a', fontWeight: '800' },
  listAddContainer: { minWidth: 45 },
  listAddBtn: {
    backgroundColor: '#fff',
    borderColor: '#16a34a',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listAddBtnText: { color: '#16a34a', fontSize: 10, fontWeight: '800' },
  listQtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  listQtyBtn: { padding: 2 },
  listQtyVal: { color: '#fff', fontSize: 13, fontWeight: '800', marginHorizontal: 6 },
  listRequestBtn: {
    backgroundColor: '#000',
    borderColor: '#000',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  listRequestBtnText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  optionsIndicatorRow: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  optionsPlaceholder: {
    height: 20,
  },
  optionsText: {
    fontSize: 9,
    color: '#16a34a',
    fontWeight: '700',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  listPricingSection: { minHeight: 26, justifyContent: 'center', marginBottom: 6 },
  listPriceRow: { flexDirection: 'row', alignItems: 'center' },
  listPrice: { fontSize: 15, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5, marginRight: 6 },
  listMrp: { fontSize: 11, color: '#94a3b8', textDecorationLine: 'line-through', fontWeight: '500' },
  listProductNameContainer: { minHeight: 65, marginBottom: 6 },
  brandBold: { fontSize: 10, fontWeight: '800', color: '#0c831f', textTransform: 'uppercase', marginBottom: 2 },
  listSubcategoryName: { fontSize: 10, fontWeight: '700', color: '#000', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
  listProductName: { fontSize: 13, fontWeight: '600', color: '#1e293b', lineHeight: 16 },
  listMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  listRating: { flexDirection: 'row', alignItems: 'center' },
  ratingVal: { fontSize: 11, fontWeight: '800', color: '#1e293b', marginLeft: 4 },
  ratingCount: { fontSize: 10, color: '#94a3b8', fontWeight: '500', marginLeft: 4 },
});

export default ProductCard;
