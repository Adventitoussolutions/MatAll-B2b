import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  ActivityIndicator,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import OfflineBanner from '../components/OfflineBanner';

import api from '../services/api';
import { getFullImageUrl } from '../utils/imageUrl';
import ProductCard from '../components/ProductCard';
import QtySelector from '../components/QtySelector';
import RequestQuoteModal from '../components/RequestQuoteModal';
import VariantModal from '../components/VariantModal';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/Colors';
import { safeParsePrice } from '../utils/priceUtils';

const { width } = Dimensions.get('window');

export default function DetailsScreen({ route, navigation }: { route: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const { product: initialProduct, productId } = route.params || {};
  const [product, setProduct] = useState<any>(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const [showReturnPolicy, setShowReturnPolicy] = useState(true);

  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [quoteVariant, setQuoteVariant] = useState<any>(null);

  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCart, updateQuantity: updateGlobalQty, cart, setQuantity } = useCart();
  const { settings } = useSettings();

  const { user } = useAuth();
  const favorite = product ? isFavorite(product._id || product.id) : false;
  const isServiceOffline = React.useMemo(() => {
    if (!settings) return false;
    return !settings.isServiceEnabled;
  }, [settings]);

  const getVariantQty = (vId: string) => {
    const item = cart.find(c => String(c.id) === String(vId) || String(c._id) === String(vId));
    return item ? item.quantity : 0;
  };

  const openVariantModal = (p: any) => {
    setSelectedProduct(p);
    setVariantModalVisible(true);
  };

  const handleVariantAdd = (variant: any) => {
    const contextProduct = selectedProduct || product;

    const productName = contextProduct?.name || variant?.productName || contextProduct?.productName || 'Product';
    const variantPrice = safeParsePrice(variant.pricing?.b2bBuyingPrice ?? variant.b2bBuyingPrice ?? contextProduct?.pricing?.b2bBuyingPrice ?? contextProduct?.b2bBuyingPrice ?? variant.pricing?.matallBuyingPrice ?? variant.matallBuyingPrice ?? contextProduct?.pricing?.matallBuyingPrice ?? contextProduct?.matallBuyingPrice ?? 0);
    const variantAttrs = variant.attributes || {};
    const variantText = variant.selectedVariant || Object.entries(variantAttrs).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Standard';
    const added = addToCart({
      id: variant._id || variant.id,
      name: productName,
      price: variantPrice,
      image: variant.imageUrl || contextProduct?.imageUrl,
      imageUrl: variant.imageUrl || contextProduct?.imageUrl,
      material: variant.material,
      finish: variant.finish,
      selectedVariant: variantText,
      mrp: 0,
      gst: variant.pricing?.gst || (selectedProduct || product)?.gst || 18,
      logisticsCategory: variant.logisticsCategory || (selectedProduct || product)?.logisticsCategory || 'Light',
      weight: variant.inventory?.unitWeight ? variant.inventory.unitWeight / 1000 : ((selectedProduct || product)?.inventory?.unitWeight ? (selectedProduct || product).inventory.unitWeight / 1000 : 0),
      volume: variant.volume || (selectedProduct || product)?.volume || 0,
      bulkPricing: (selectedProduct || product)?.bulkPricing,
      deliveryTime: (selectedProduct || product)?.deliveryTime || '15 mins',
      attributes: variantAttrs,
      parentProductId: (selectedProduct || product)?._id || (selectedProduct || product)?.id || variant.productId
    });
    if (added) {
      Toast.show({
        type: 'success',
        text1: 'Added to Cart',
        text2: `${productName} has been added to your cart.`,
        visibilityTime: 2000,
      });
    }
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const id = productId || initialProduct?._id || initialProduct?.id;
      if (!id) return;

      const { data } = await api.get(`/api/products/${id}`);
      setProduct(data);

      if (data.variants && data.variants.length > 0) {
        const firstVariant = data.variants[0];
        setSelectedVariant(firstVariant);

        const initialSelections: Record<string, string> = {};
        if (firstVariant.attributes instanceof Object) {
          Object.entries(firstVariant.attributes).forEach(([name, value]) => {
            initialSelections[name] = value as string;
          });
        }
        setSelections(initialSelections);
      }

      try {
        const reviewsRes = await api.get(`/api/products/${id}/reviews`);
        setReviews(reviewsRes.data || []);
      } catch (rErr) {
        console.error("Failed to fetch reviews", rErr);
      }

      const catName = data.category?.name || data.category || data.categoryId;
      const similarRes = await api.get(`/api/products?category=${encodeURIComponent(catName)}`);
      const similarList = similarRes.data.products || similarRes.data || [];
      setSimilarProducts(similarList.filter((p: any) => String(p._id) !== String(id)).slice(0, 8));
    } catch (err) {
      console.error('Failed to fetch product details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  // Find variant that matches current selections
  useEffect(() => {
    if (!product?.variants) return;

    const matchingVariant = product.variants.find((v: any) => {
      return Object.entries(selections).every(([name, value]) => {
        return v.attributes && v.attributes[name] === value;
      });
    });

    if (matchingVariant && matchingVariant._id !== selectedVariant?._id) {
      setSelectedVariant(matchingVariant);
    }
  }, [selections, product?.variants, selectedVariant?._id]);

  const attributeGroups = useMemo(() => {
    if (!product?.variants) return {};
    const groups: Record<string, Set<string>> = {};
    product.variants.forEach((v: any) => {
      if (v.attributes) {
        Object.entries(v.attributes).forEach(([name, value]) => {
          if (!groups[name]) groups[name] = new Set();
          groups[name].add(value as string);
        });
      }
    });
    return groups;
  }, [product?.variants]);

  const handleSelectAttribute = (name: string, val: string) => {
    if (!product?.variants) return;

    const targetSelections = { ...selections, [name]: val };

    let matchingVariant = product.variants.find((v: any) => {
      return Object.entries(targetSelections).every(([k, vVal]) => {
        return v.attributes && v.attributes[k] === vVal;
      });
    });

    if (!matchingVariant) {
      matchingVariant = product.variants.find((v: any) => {
        return v.attributes && v.attributes[name] === val;
      });
    }

    if (matchingVariant && matchingVariant.attributes) {
      const newSelections: Record<string, string> = {};
      Object.entries(matchingVariant.attributes).forEach(([k, vVal]) => {
        newSelections[k] = vVal as string;
      });
      setSelections(newSelections);
    }
  };

  const shouldShowOption = (attrName: string, attrVal: string) => {
    if (!product?.variants) return false;

    const attrNames = Object.keys(attributeGroups);
    const currentIndex = attrNames.indexOf(attrName);

    if (currentIndex <= 0) return true;

    return product.variants.some((v: any) => {
      if (!v.attributes) return false;
      if (v.attributes[attrName] !== attrVal) return false;

      for (let j = 0; j < currentIndex; j++) {
        const prevName = attrNames[j];
        if (v.attributes[prevName] !== selections[prevName]) {
          return false;
        }
      }
      return true;
    });
  };

  const handleShare = async () => {
    try {
      const productIdToShare = product._id || product.id || productId;
      const productUrl = `https://matall.app/product/${productIdToShare}`;
      const baseMessage = `Check out ${product.brand} ${product.productName || product.name} on MatAll!`;

      if (Platform.OS === 'ios') {
        await Share.share({
          message: baseMessage,
          url: productUrl,
        });
      } else {
        await Share.share({
          message: `${baseMessage}\n\n${productUrl}`,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const images = (selectedVariant?.images && selectedVariant.images.length > 0)
    ? selectedVariant.images
    : (product?.images && product.images.length > 0 ? product.images : [product?.imageUrl || product?.image]);

  const currentPrice = safeParsePrice(
    selectedVariant?.pricing?.b2bBuyingPrice ||
    selectedVariant?.b2bBuyingPrice ||
    product?.pricing?.b2bBuyingPrice ||
    product?.b2bBuyingPrice ||
    selectedVariant?.pricing?.matallBuyingPrice ||
    selectedVariant?.matallBuyingPrice ||
    product?.pricing?.matallBuyingPrice ||
    product?.matallBuyingPrice ||
    0
  );

  const basePrice = safeParsePrice(
    selectedVariant?.pricing?.buyingBasePrice ||
    selectedVariant?.buyingBasePrice ||
    product?.pricing?.buyingBasePrice ||
    product?.buyingBasePrice ||
    (currentPrice / (1 + (selectedVariant?.pricing?.gst || product?.gst || 18) / 100))
  );

  const gstAmount = safeParsePrice(
    selectedVariant?.pricing?.buyingGst ||
    selectedVariant?.buyingGst ||
    product?.pricing?.buyingGst ||
    product?.buyingGst ||
    (currentPrice - basePrice)
  );
  const currentMrp = 0; // Disable MRP display
  const currentUnit = selectedVariant && selectedVariant.attributes
    ? Object.values(selectedVariant.attributes).join(', ')
    : (product?.unitLabel || 'Standard');

  const AccordionItem = ({ title, isOpen, onPress }: { title: string, isOpen: boolean, onPress: () => void }) => (
    <TouchableOpacity style={styles.accordionHeader} onPress={onPress}>
      <Text style={styles.accordionTitle}>{title}</Text>
      <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={Colors.status.successGreen} />
    </TouchableOpacity>
  );

  if (loading || !product) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{product.brand} {product.productName || product.name}</Text>
            <Text style={styles.headerSubtitle}>PRODUCT DETAILS</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Ionicons name="home-outline" size={24} color={Colors.black} />
          </TouchableOpacity>
        </View>

        {isServiceOffline && (
          <OfflineBanner />
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.imageSection}>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                setActiveImgIdx(Math.round(x / width));
              }}
              renderItem={({ item }) => (
                <View style={{ width: width, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                  <Image
                    source={{ uri: getFullImageUrl(item) }}
                    style={styles.mainImage}
                    contentFit="contain"
                    transition={200}
                  />
                </View>
              )}
              keyExtractor={(_, index) => index.toString()}
            />
            <View style={styles.pagination}>
              {images.map((_: any, idx: number) => (
                <View
                  key={idx}
                  style={[styles.dot, activeImgIdx === idx && styles.activeDot]}
                />
              ))}
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              {product.deliveryTime && (
                <View style={[styles.deliveryBadge, product.deliveryTime === 'On Demand' && { backgroundColor: Colors.background.warning }]}>
                  <Ionicons name="time-outline" size={14} color={Colors.text.muted} />
                  <Text style={styles.deliveryText}>{product.deliveryTime}</Text>
                </View>
              )}
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color={Colors.status.warning} />
                <Text style={styles.ratingText}>{(product.avgRating || 0).toFixed(1)} ({product.numReviews || '0'})</Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => {
                  if (!user) {
                    Toast.show({ type: 'info', text1: 'Login Required', text2: 'Please log in to use this feature.' });
                    return;
                  }
                  toggleFavorite(product);
                }}
                style={styles.detailsWishlistBtn}
              >
                <Ionicons
                  name={favorite ? "heart" : "heart-outline"}
                  size={22}
                  color={favorite ? Colors.status.errorDeep : Colors.text.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                <Ionicons name="share-social-outline" size={20} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.productTitle}>
              <Text style={{ color: Colors.black, fontWeight: '900' }}>{product.brand}</Text> {product.productName || product.name}
            </Text>
            <Text style={styles.productUnitLabel}>{currentUnit}</Text>
          </View>

          {Object.keys(attributeGroups).length > 0 && (
            <View style={styles.selectionSection}>
              {Object.entries(attributeGroups)
                .filter(([name]) => {
                  const lowName = name.toLowerCase().trim();
                  return lowName !== 'pack of' && lowName !== 'sold as';
                })
                .map(([name, values]) => {
                  const visibleValues = Array.from(values).filter(val => shouldShowOption(name, val));
                  if (visibleValues.length === 0) return null;

                  return (
                    <View key={name} style={{ marginBottom: 12 }}>
                      <Text style={styles.selectionLabel}>Select {name}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {visibleValues.map((val) => (
                          <TouchableOpacity
                            key={val}
                            onPress={() => handleSelectAttribute(name, val)}
                            style={[
                              styles.pill,
                              selections[name] === val && styles.activePill
                            ]}
                          >
                            <Text style={[
                              styles.pillText,
                              selections[name] === val && styles.activePillText
                            ]}>
                              {val}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })}
            </View>
          )}

          <View style={styles.priceSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.priceText}>₹{currentPrice.toFixed(2)}</Text>
              {currentMrp > currentPrice && (
                <Text style={styles.mrpText}>MRP ₹{currentMrp.toFixed(2)}</Text>
              )}
            </View>
            <Text style={styles.taxInfo}>(₹{basePrice.toFixed(2)} + GST ₹{gstAmount.toFixed(2)})</Text>

            {(currentMrp > currentPrice && currentMrp > 0) && (
              <View style={styles.discountBadgeDetail}>
                <Text style={styles.discountBadgeText}>
                  {Math.round(((currentMrp - currentPrice) / currentMrp) * 100)}% OFF on MRP
                </Text>
              </View>
            )}
          </View>

          <View style={styles.accordionSection}>
            <AccordionItem
              title="View product details"
              isOpen={showDetails}
              onPress={() => setShowDetails(!showDetails)}
            />
            {showDetails && (
              <View style={styles.specTextContent}>
                <Text style={styles.specDesc}>
                  {product.description || "High-quality material sourced for durability and aesthetic perfection."}
                </Text>
              </View>
            )}

            <AccordionItem
              title="Technical Specifications"
              isOpen={showSpecs}
              onPress={() => setShowSpecs(!showSpecs)}
            />
            {showSpecs && (
              <View style={styles.specTable}>
                {[
                  ['Brand', product.brand],
                  ['Category', product.categoryName || product.category],
                  ['Sub-Category', product.subCategoryName || product.subCategory || '-'],
                  ['Product Id', product.productId || product._id?.slice(-8).toUpperCase() || 'N/A'],
                  ...(selectedVariant ? [
                    ['Variant Id', selectedVariant.variantId || 'N/A'],
                    ['Product Code', selectedVariant.productCode || product.productCode || 'N/A'],
                    ...(Object.entries(selectedVariant.attributes || {})
                      .filter(([k]) => {
                        const lowKey = k.toLowerCase().trim();
                        return lowKey !== 'pack of' && lowKey !== 'sold as';
                      })
                      .map(([k, v]) => [k, v as string])),
                    ...(selectedVariant.inventory?.unitWeight > 0 ? [['Unit Weight', `${selectedVariant.inventory.unitWeight} gm`]] : []),
                    ...(selectedVariant.meta?.warranty ? [['Warranty', selectedVariant.meta.warranty]] : []),
                    ...(selectedVariant.meta?.suitableFor ? [['Suitable For', selectedVariant.meta.suitableFor]] : []),
                    ...(selectedVariant.meta?.suppliedWith ? [['Supplied With', selectedVariant.meta.suppliedWith]] : []),
                    ...(selectedVariant.inventory?.packOf ? [['Pack of', selectedVariant.inventory.packOf]] : []),
                    ...(selectedVariant.inventory?.soldAs ? [['Sold as', selectedVariant.inventory.soldAs]] : []),
                  ] : []),
                  ...(product.deliveryTime ? [['Delivery', product.deliveryTime]] : []),
                ].map(([label, value], idx) => (
                  <View key={idx} style={[styles.specRow, idx % 2 === 0 && styles.specRowEven]}>
                    <Text style={styles.specLabel}>{label}</Text>
                    <Text style={styles.specValue}>{value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.premiumPolicySection}>
            <TouchableOpacity
              style={styles.policyHeaderPremium}
              onPress={() => setShowReturnPolicy(!showReturnPolicy)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.status.successGreen} />
                <Text style={styles.policyTitlePremium}>Standard Return Policy</Text>
              </View>
              <Ionicons name={showReturnPolicy ? "chevron-up" : "chevron-down"} size={20} color={Colors.text.muted} />
            </TouchableOpacity>

            {showReturnPolicy && (
              <View style={styles.policyBodyPremium}>
                <Text style={styles.policyIntroText}>
                  Returns are accepted if requested within the defined timeframes and meet the specified conditions.
                </Text>

                <View style={styles.policyItemPremium}>
                  <View style={[styles.policyIconBoxPremium, { backgroundColor: Colors.background.error }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={Colors.status.errorDeep} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.policyRowPremium}>
                      <Text style={styles.policyLabelPremium}>Damaged Product</Text>
                      <View style={[styles.policyBadgePremium, { backgroundColor: Colors.background.error }]}>
                        <Text style={[styles.policyBadgeTextPremium, { color: Colors.status.errorDeep }]}>15 Mins</Text>
                      </View>
                    </View>
                    <Text style={styles.policyDescPremium}>Report any physical damage immediately upon delivery.</Text>
                  </View>
                </View>

                <View style={styles.policyItemPremium}>
                  <View style={[styles.policyIconBoxPremium, { backgroundColor: Colors.background.error }]}>
                    <Ionicons name="refresh-outline" size={18} color={Colors.status.errorDeep} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.policyRowPremium}>
                      <Text style={styles.policyLabelPremium}>Different Item</Text>
                      <View style={[styles.policyBadgePremium, { backgroundColor: Colors.background.error }]}>
                        <Text style={[styles.policyBadgeTextPremium, { color: Colors.status.errorDeep }]}>15 Mins</Text>
                      </View>
                    </View>
                    <Text style={styles.policyDescPremium}>If the delivered product does not match your order.</Text>
                  </View>
                </View>

                <View style={styles.policyItemPremium}>
                  <View style={[styles.policyIconBoxPremium, { backgroundColor: Colors.background.info }]}>
                    <Ionicons name="information-circle-outline" size={18} color={Colors.status.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.policyRowPremium}>
                      <Text style={styles.policyLabelPremium}>Hardware Fit Issue</Text>
                      <View style={[styles.policyBadgePremium, { backgroundColor: Colors.background.info }]}>
                        <Text style={[styles.policyBadgeTextPremium, { color: Colors.status.info }]}>1 Hour</Text>
                      </View>
                    </View>
                    <Text style={styles.policyDescPremium}>Items must have original packing, no scratches, and no smudges.</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {similarProducts.length > 0 && (
            <View style={styles.similarSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Similar products</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ShopPage', {
                  categoryName: product.categoryName || product.category
                })}>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarScroll}>
                {similarProducts.map(item => (
                  <ProductCard
                    key={item._id}
                    item={item}
                    navigation={navigation}
                    isFavorite={isFavorite}
                    toggleFavorite={toggleFavorite}
                    addToCart={addToCart}
                    updateGlobalQty={updateGlobalQty}
                    setGlobalQty={setQuantity}
                    cart={cart}
                    openVariantModal={openVariantModal}
                    horizontal={true}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.priceContainer}>
            <Text style={styles.bottomUnitLabel}>{currentUnit}</Text>
            <Text style={styles.bottomPrice}>₹{currentPrice.toFixed(2)}</Text>
            <Text style={styles.bottomTax}>incl. GST</Text>
          </View>

          {product.deliveryTime === 'On Demand' ? (
            <TouchableOpacity
              style={styles.addToCartBtn}
              onPress={() => {
                setQuoteVariant(selectedVariant || product);
                setQuoteModalVisible(true);
              }}
            >
              <Text style={styles.addToCartText}>Request Quote</Text>
            </TouchableOpacity>
          ) : getVariantQty(String(selectedVariant?._id || product?._id || product?.id)) > 0 ? (
            <QtySelector
              quantity={getVariantQty(String(selectedVariant?._id || product?._id || product?.id))}
              onUpdate={(delta) => updateGlobalQty(String(selectedVariant?._id || product?._id || product?.id), delta)}
              onSet={(val) => setQuantity(String(selectedVariant?._id || product?._id || product?.id), val)}
              containerStyle={styles.qtySelectorLarge}
              btnStyle={styles.qtyBtnLarge}
              inputStyle={styles.qtyTextLarge}
              iconColor={Colors.white}
              iconSize={24}
            />
          ) : (
            <TouchableOpacity
              style={styles.addToCartBtn}
              onPress={() => handleVariantAdd(selectedVariant || product)}
            >
              <Text style={styles.addToCartText}>Add to cart</Text>
            </TouchableOpacity>
          )}
        </View>

        <VariantModal
          visible={variantModalVisible}
          onClose={() => setVariantModalVisible(false)}
          selectedProduct={selectedProduct}
          getVariantQty={getVariantQty}
          updateGlobalQty={updateGlobalQty}
          setQuantity={setQuantity}
          handleVariantAdd={handleVariantAdd}
          onRequestQuote={(v) => {
            setQuoteVariant(v);
            setQuoteModalVisible(true);
          }}
        />

        <RequestQuoteModal
          visible={quoteModalVisible}
          onClose={() => setQuoteModalVisible(false)}
          product={product}
          variant={quoteVariant}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.white,
  },
  headerTitleContainer: { alignItems: 'center', flex: 1, paddingHorizontal: 10 },
  headerTitle: { fontSize: 14, fontWeight: '800', color: Colors.text.primary },
  headerSubtitle: { fontSize: 9, color: Colors.text.muted, marginTop: 2, letterSpacing: 1, fontWeight: '700' },

  imageSection: {
    height: width,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: { width: width - 40, height: width - 40 },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border.light, marginHorizontal: 3 },
  activeDot: { backgroundColor: Colors.black, width: 14 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 5,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center' },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  deliveryText: { fontSize: 11, color: Colors.text.primary, marginLeft: 4, fontWeight: '600' },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  ratingText: { fontSize: 11, color: Colors.text.warning, marginLeft: 4, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  detailsWishlistBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleSection: { paddingHorizontal: 16, marginBottom: 20 },
  productTitle: { fontSize: 22, fontWeight: '500', color: Colors.text.primary, marginBottom: 4, lineHeight: 28 },
  productUnitLabel: { fontSize: 13, color: Colors.text.muted, fontWeight: '500' },

  selectionSection: { paddingHorizontal: 16, marginBottom: 20 },
  selectionLabel: { fontSize: 12, fontWeight: '800', color: Colors.text.primary, marginBottom: 10 },
  pill: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    minWidth: '22%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  pillText: { color: Colors.text.primary, fontSize: 13, fontWeight: '600' },
  activePillText: { color: Colors.primary, fontWeight: '800' },

  priceSection: { paddingHorizontal: 16, marginBottom: 25 },
  priceText: { fontSize: 28, fontWeight: '900', color: Colors.text.primary },
  mrpText: { fontSize: 14, color: Colors.text.muted, textDecorationLine: 'line-through', marginLeft: 10, fontWeight: '500' },
  taxInfo: { fontSize: 12, color: Colors.text.muted, marginTop: 4, fontWeight: '500' },
  discountBadgeDetail: {
    backgroundColor: Colors.status.info,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
    elevation: 2,
    shadowColor: Colors.status.info,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  discountBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '900' },

  accordionSection: { borderTopWidth: 1, borderTopColor: Colors.border.light },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  accordionTitle: { fontSize: 14, fontWeight: '700', color: Colors.status.successGreen },
  specTextContent: { padding: 16, backgroundColor: Colors.background.secondary },
  specDesc: { fontSize: 14, color: Colors.text.primary, lineHeight: 22 },
  specTable: { padding: 16 },
  specRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8 },
  specRowEven: { backgroundColor: Colors.background.secondary },
  specLabel: { flex: 1, fontSize: 12, color: Colors.text.muted, fontWeight: '600' },
  specValue: { flex: 1.5, fontSize: 12, color: Colors.text.primary, fontWeight: '600' },

  premiumPolicySection: { marginHorizontal: 16, marginTop: 10, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.light },
  policyHeaderPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: Colors.background.success,
  },
  policyTitlePremium: { fontSize: 14, fontWeight: '700', color: Colors.status.successGreen, marginLeft: 8 },
  policyBodyPremium: { padding: 14, backgroundColor: Colors.white },
  policyIntroText: { fontSize: 12, color: Colors.text.muted, marginBottom: 16, lineHeight: 18 },
  policyItemPremium: { flexDirection: 'row', marginBottom: 16 },
  policyIconBoxPremium: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  policyRowPremium: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, marginBottom: 4 },
  policyLabelPremium: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  policyBadgePremium: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  policyBadgeTextPremium: { fontSize: 10, fontWeight: '800' },
  policyDescPremium: { fontSize: 11, color: Colors.text.muted, lineHeight: 16 },

  similarSection: { padding: 16, marginTop: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: Colors.text.primary },
  seeAllText: { fontSize: 12, color: Colors.status.successGreen, fontWeight: '700' },
  similarScroll: { paddingRight: 20 },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    alignItems: 'center',
    elevation: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  priceContainer: { flex: 1 },
  bottomUnitLabel: { fontSize: 11, color: Colors.text.muted, fontWeight: '600', marginBottom: 2 },
  bottomPrice: { fontSize: 22, fontWeight: '900', color: Colors.text.primary },
  bottomTax: { fontSize: 10, color: Colors.text.muted, fontWeight: '500' },
  addToCartBtn: {
    backgroundColor: Colors.status.successGreen,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartText: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  qtySelectorLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.successGreen,
    borderRadius: 12,
    paddingHorizontal: 8,
    minWidth: 150,
    height: 52,
    justifyContent: 'space-between',
  },
  qtyBtnLarge: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyTextLarge: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '900',
    marginHorizontal: 15,
  },
});
