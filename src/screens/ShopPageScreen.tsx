import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import OfflineBanner from '../components/OfflineBanner';
import api from '../services/api';
import { getFullImageUrl } from '../utils/imageUrl';
import Toast from 'react-native-toast-message';
import ProductCard from '../components/ProductCard';
import QtySelector from '../components/QtySelector';
import RequestQuoteModal from '../components/RequestQuoteModal';
import VariantModal from '../components/VariantModal';
import { Colors } from '../constants/Colors';
import { safeParsePrice } from '../utils/priceUtils';

export default function ShopPageScreen({ navigation, route }: any) {
  const { categoryId, categoryName, brandId, brandName, subCategoryId, search } = route.params || {};

  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [allBrands, setAllBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedBrand, setSelectedBrand] = useState(brandName || brandId || 'all');
  const [selectedCategory, setSelectedCategory] = useState(categoryName || categoryId || null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(subCategoryId || null);
  const [searchQuery, setSearchQuery] = useState(search || '');

  // Sync state with route params when navigating back to the same screen with different params
  useEffect(() => {
    const params = route.params || {};
    setSelectedBrand(params.brandName || params.brandId || 'all');
    setSelectedCategory(params.categoryName || params.categoryId || null);
    setSelectedSubCategory(params.subCategoryId || null);
    setSearchQuery(params.search || '');
  }, [route.params]);

  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilterCat, setActiveFilterCat] = useState<any>(null);
  const [modalSubCategories, setModalSubCategories] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'default' | 'price-low' | 'price-high'>('default');

  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quoteVariant, setQuoteVariant] = useState<any>(null);

  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCart, updateQuantity: updateGlobalQty, cart, setQuantity } = useCart();
  const { settings } = useSettings();

  const fetchBrands = async () => {
    try {
      const { data } = await api.get('/api/products/brands');
      setAllBrands(data || []);
      setBrands([{ _id: 'all', name: 'All Brands' }, ...(data || [])]);
    } catch (err) {
      console.error('Failed to fetch brands', err);
    } finally {
      setBrandsLoaded(true);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/api/products/categories');
      setCategories(data || []);
      if (data && data.length > 0 && !activeFilterCat) setActiveFilterCat(data[0]._id);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    } finally {
      setCategoriesLoaded(true);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const isId = /^[0-9a-fA-F]{24}$/.test(selectedCategory);
      let catName = selectedCategory;
      if (isId && categories.length > 0) {
        const cat = categories.find(c => c._id === selectedCategory);
        if (cat) catName = cat.name;
      }

      const params: Record<string, string> = {};
      if (selectedBrand && selectedBrand !== 'all') params.brand = selectedBrand;
      if (catName) params.category = catName;
      if (selectedSubCategory) params.subCategory = selectedSubCategory;
      if (searchQuery) params.search = searchQuery;

      const config = Object.keys(params).length > 0 ? { params } : undefined;
      const { data } = await api.get('/api/products', config).catch(err => {
        console.log('Failed to fetch products, returning fallback array', err.message);
        return { data: [] };
      });

      setProducts(data || []);

      if (selectedBrand === 'all' && data && data.length > 0) {
        const uniqueBrandNames = [...new Set(data.map((p: any) => p.brand))].filter(Boolean) as string[];
        const derivedBrands = uniqueBrandNames.map(name => ({
          _id: name,
          name: name,
          logoUrl: allBrands.find(b => b.name === name)?.logoUrl || null
        }));

        const newBrands = [{ _id: 'all', name: 'All Brands' }, ...derivedBrands];
        if (JSON.stringify(newBrands) !== JSON.stringify(brands)) {
          setBrands(newBrands);
        }
      }
    } catch (err) {
      console.log('Failed to fetch products', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedBrand, selectedCategory, selectedSubCategory, searchQuery]);

  // Fetch subcategories for the modal
  useEffect(() => {
    const fetchModalSubCats = async () => {
      if (!activeFilterCat || !filterVisible) return;
      try {
        const { data } = await api.get(`/api/products/sub-categories?categoryId=${activeFilterCat}`);
        setModalSubCategories(data || []);
      } catch (err) {
        console.error('Failed to fetch modal subcategories', err);
      }
    };
    fetchModalSubCats();
  }, [activeFilterCat, filterVisible]);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (sortBy === 'price-low') {
      result.sort((a, b) => {
        const priceA = safeParsePrice(a.pricing?.b2bBuyingPrice || a.b2bBuyingPrice || a.pricing?.matallBuyingPrice || a.matallBuyingPrice || a.price || a.pricing?.salePrice);
        const priceB = safeParsePrice(b.pricing?.b2bBuyingPrice || b.b2bBuyingPrice || b.pricing?.matallBuyingPrice || b.matallBuyingPrice || b.price || b.pricing?.salePrice);
        return priceA - priceB;
      });
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => {
        const priceA = safeParsePrice(a.pricing?.b2bBuyingPrice || a.b2bBuyingPrice || a.pricing?.matallBuyingPrice || a.matallBuyingPrice || a.price || a.pricing?.salePrice);
        const priceB = safeParsePrice(b.pricing?.b2bBuyingPrice || b.b2bBuyingPrice || b.pricing?.matallBuyingPrice || b.matallBuyingPrice || b.price || b.pricing?.salePrice);
        return priceB - priceA;
      });
    }
    return result;
  }, [products, sortBy]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [selectedBrand, selectedCategory, selectedSubCategory]);

  const handleVariantAdd = (variant: any) => {
    const productName = variant?.name || selectedProduct?.name || variant?.productName || selectedProduct?.productName || 'Product';
    const variantPrice = safeParsePrice(variant.pricing?.b2bBuyingPrice ?? variant.b2bBuyingPrice ?? selectedProduct?.pricing?.b2bBuyingPrice ?? selectedProduct?.b2bBuyingPrice ?? variant.pricing?.matallBuyingPrice ?? variant.matallBuyingPrice ?? selectedProduct?.pricing?.matallBuyingPrice ?? selectedProduct?.matallBuyingPrice ?? 0);
    const variantAttrs = variant.attributes || {};
    const variantText = variant.selectedVariant || Object.entries(variantAttrs).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Standard';

    const added = addToCart({
      id: variant._id || variant.id,
      name: productName,
      price: variantPrice,
      image: variant.imageUrl || selectedProduct?.imageUrl,
      imageUrl: variant.imageUrl || selectedProduct?.imageUrl,
      material: variant.material,
      finish: variant.finish,
      selectedVariant: variantText,
      mrp: 0,
      gst: variant.pricing?.gst || selectedProduct?.gst || 18,
      logisticsCategory: variant.logisticsCategory || selectedProduct?.logisticsCategory || 'Light',
      weight: variant.inventory?.unitWeight ? variant.inventory.unitWeight / 1000 : (selectedProduct?.inventory?.unitWeight ? selectedProduct.inventory.unitWeight / 1000 : 0),
      volume: variant.volume || selectedProduct?.volume || 0,
      attributes: variantAttrs,
      parentProductId: selectedProduct?._id || selectedProduct?.id || variant.productId,
      brand: variant.brand || selectedProduct?.brand
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

  const getVariantQty = (id: string) => {
    return cart.find(item => item.id === id)?.quantity || 0;
  };

  const openVariantModal = async (product: any) => {
    setSelectedProduct(product);
    setVariantModalVisible(true);
  };

  const renderProduct = ({ item }: { item: any }) => (
    <ProductCard
      item={item}
      navigation={navigation}
      isFavorite={isFavorite}
      toggleFavorite={toggleFavorite}
      addToCart={addToCart}
      updateGlobalQty={updateGlobalQty}
      setGlobalQty={setQuantity}
      cart={cart}
      openVariantModal={openVariantModal}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('ShopHome');
          }
        }} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Products Online</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ShopHome')} style={styles.headerBtn}>
          <Ionicons name="home-outline" size={24} color={Colors.black} />
        </TouchableOpacity>
      </View>

      {settings && !settings.isServiceEnabled && (
        <OfflineBanner message={settings.offlineMessage} />
      )}

      <View style={styles.filterBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBarScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterVisible && styles.activeFilterChip]}
            onPress={() => setFilterVisible(true)}
          >
            <Ionicons name="options-outline" size={16} color={filterVisible ? Colors.primary : Colors.black} />
            <Text style={[styles.filterChipText, filterVisible && styles.activeFilterChipText]}>Filter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, sortBy !== 'default' && styles.activeFilterChip]}
            onPress={() => {
              if (sortBy === 'default') setSortBy('price-low');
              else if (sortBy === 'price-low') setSortBy('price-high');
              else setSortBy('default');
            }}
          >
            <Ionicons
              name={sortBy === 'default' ? "swap-vertical-outline" : "arrow-up-outline"}
              size={14}
              color={sortBy !== 'default' ? Colors.primary : Colors.black}
              style={sortBy === 'price-high' && { transform: [{ rotate: '180deg' }] }}
            />
            <Text style={[styles.filterChipText, sortBy !== 'default' && styles.activeFilterChipText]}>
              {sortBy === 'price-low' ? 'Low to High' : sortBy === 'price-high' ? 'High to Low' : 'Sort'}
            </Text>
          </TouchableOpacity>

          {selectedCategory && (
            <TouchableOpacity
              style={[styles.filterChip, styles.activeFilterChip]}
              onPress={() => {
                setSelectedCategory(null);
                setSelectedSubCategory(null);
              }}
            >
              <Text style={[styles.filterChipText, styles.activeFilterChipText]}>
                {categories.find(c => c._id === selectedCategory || c.name === selectedCategory)?.name || selectedCategory}
              </Text>
              <Ionicons name="close-circle" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}

          {selectedSubCategory && (
            <TouchableOpacity
              style={[styles.filterChip, styles.activeFilterChip]}
              onPress={() => setSelectedSubCategory(null)}
            >
              <Text style={[styles.filterChipText, styles.activeFilterChipText]}>{selectedSubCategory}</Text>
              <Ionicons name="close-circle" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}

          {searchQuery ? (
            <TouchableOpacity
              style={[styles.filterChip, styles.activeFilterChip]}
              onPress={() => setSearchQuery('')}
            >
              <Text style={[styles.filterChipText, styles.activeFilterChipText]}>Search: {searchQuery}</Text>
              <Ionicons name="close-circle" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ) : null}

          {(selectedCategory || selectedBrand !== 'all' || sortBy !== 'default' || searchQuery) && (
            <TouchableOpacity
              style={styles.clearFiltersBtn}
              onPress={() => {
                setSelectedCategory(null);
                setSelectedSubCategory(null);
                setSelectedBrand('all');
                setSortBy('default');
                setSearchQuery('');
              }}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {brands.map((brand, index) => (
              <TouchableOpacity
                key={`${brand._id}-${index}`}
                onPress={() => setSelectedBrand(brand._id)}
                style={[styles.sidebarItem, selectedBrand === brand._id && styles.activeSidebarItem]}
              >
                <View style={styles.brandLogoBox}>
                  {brand.logoUrl ? (
                    <Image source={{ uri: getFullImageUrl(brand.logoUrl) }} style={styles.brandLogoImg} contentFit="contain" transition={200} />
                  ) : (
                    <Text style={styles.brandLogoTxt}>{brand.name ? brand.name.charAt(0) : '?'}</Text>
                  )}
                </View>
                <Text style={[styles.brandLabel, selectedBrand === brand._id && styles.activeBrandLabel]}>{brand.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading && !refreshing ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.black} />
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            numColumns={2}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={{ flex: 1, padding: 40, alignItems: 'center', marginTop: 100 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#94A3B8', textAlign: 'center', marginBottom: 40 }}>
                  No products found for this selection.
                </Text>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#22C55E',
                    paddingVertical: 18,
                    paddingHorizontal: 30,
                    borderRadius: 40,
                    elevation: 5,
                    shadowColor: '#22C55E',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                  }}
                  onPress={() => {
                    const phoneNumber = '919216921698';
                    const message = 'Hi, I couldn\'t find a product on MatAll. Can you help?';
                    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                    Linking.openURL(url).catch(() => {
                      Alert.alert('Error', 'Could not open WhatsApp. Please make sure WhatsApp is installed.');
                    });
                  }}
                >
                  <MaterialCommunityIcons name="whatsapp" size={24} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Contact us on WhatsApp</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      <Modal visible={filterVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Shop by Category</Text>
                <TouchableOpacity onPress={() => setFilterVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={Colors.black} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalMain}>
                <View style={styles.modalSidebar}>
                  <ScrollView>
                    {categories.map((cat, index) => (
                      <TouchableOpacity
                        key={`${cat._id}-${index}`}
                        onPress={() => setActiveFilterCat(cat._id)}
                        style={[styles.modalSidebarItem, activeFilterCat === cat._id && styles.activeModalSidebarItem]}
                      >
                        <Text style={[styles.modalSidebarText, activeFilterCat === cat._id && styles.activeModalSidebarText]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.modalGridContainer}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.activeCatTitle}>
                      {categories.find(c => c._id === activeFilterCat)?.name}
                    </Text>
                    <View style={styles.subCatGrid}>
                      {modalSubCategories.length > 0 ? modalSubCategories.map((sc) => (
                        <TouchableOpacity
                          key={sc._id}
                          style={styles.subCatCard}
                          onPress={() => {
                            setSelectedCategory(activeFilterCat);
                            setSelectedSubCategory(sc.name);
                            setFilterVisible(false);
                          }}
                        >
                          <View style={styles.subCatImgBox}>
                            {(() => {
                              const imgUrl = products.find(p => p.subCategory === sc.name)?.imageUrl;
                              return imgUrl ? (
                                <Image
                                  source={{ uri: getFullImageUrl(imgUrl) }}
                                  style={styles.subCatImg}
                                  contentFit="contain"
                                  transition={200}
                                />
                              ) : (
                                <Text style={{ fontSize: 24, fontWeight: '700', color: Colors.status.successGreen }}>
                                  {sc.name ? sc.name.charAt(0).toUpperCase() : '?'}
                                </Text>
                              );
                            })()}
                          </View>
                          <Text style={styles.subCatName} numberOfLines={2}>{sc.name}</Text>
                        </TouchableOpacity>
                      )) : (
                        <Text style={{ fontSize: 12, color: Colors.text.muted, marginTop: 20 }}>No subcategories found</Text>
                      )}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
        product={selectedProduct}
        variant={quoteVariant}
      />
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
    position: 'relative',
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.black,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 5,
  },
  filterBarContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  filterBarScroll: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  activeFilterChip: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  filterChipText: { fontSize: 12, fontWeight: '700', color: Colors.text.primary, marginLeft: 4 },
  activeFilterChipText: { color: Colors.primary, fontWeight: '800' },
  clearFiltersBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  clearFiltersText: { fontSize: 12, fontWeight: '800', color: Colors.status.errorDeep },
  mainContent: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 65, borderRightWidth: 1, borderRightColor: Colors.border.light },
  sidebarItem: { alignItems: 'center', paddingVertical: 15 },
  activeSidebarItem: { borderLeftWidth: 4, borderLeftColor: Colors.status.successGreen },
  brandLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    overflow: 'hidden'
  },
  brandLogoImg: { width: 30, height: 30, resizeMode: 'contain' },
  brandLogoTxt: { fontSize: 16, fontWeight: '700', color: Colors.status.successGreen },
  brandLabel: { fontSize: 10, textAlign: 'center', color: Colors.text.muted },
  activeBrandLabel: { fontWeight: '700', color: Colors.black },
  productList: { padding: 10, paddingBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: Colors.ui.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, height: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    position: 'relative'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
    zIndex: 10,
  },
  modalMain: { flex: 1, flexDirection: 'row' },
  modalSidebar: { width: 100, borderRightWidth: 1, borderRightColor: Colors.border.light },
  modalSidebarItem: { padding: 15, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  activeModalSidebarItem: { backgroundColor: Colors.white, borderLeftColor: Colors.status.successGreen },
  modalSidebarText: { fontSize: 12, color: Colors.text.muted },
  activeModalSidebarText: { fontWeight: '700', color: Colors.black },
  modalGridContainer: { flex: 1, padding: 16 },
  activeCatTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  subCatGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  subCatCard: { width: '45%', marginRight: '5%', marginBottom: 20, alignItems: 'center' },
  subCatImgBox: { width: '100%', height: 80, backgroundColor: Colors.background.secondary, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  subCatImg: { width: 60, height: 60, resizeMode: 'contain' },
  subCatName: { fontSize: 11, fontWeight: '600', textAlign: 'center', color: Colors.text.primary },
});
