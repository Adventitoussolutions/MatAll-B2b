import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { getFullImageUrl } from '../utils/imageUrl';
import { useSettings } from '../context/SettingsContext';
import OfflineBanner from '../components/OfflineBanner';
import { Colors } from '../constants/Colors';
import { safeParsePrice } from '../utils/priceUtils';

const { width } = Dimensions.get('window');

export default function FavoritesScreen({ navigation }: any) {
  const { favorites, toggleFavorite, loading, refreshFavorites } = useFavorites();
  const { addToCart } = useCart();
  const { settings } = useSettings();

  const renderFavoriteItem = ({ item }: { item: any }) => (
    <View style={styles.favCard}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: getFullImageUrl(item.imageUrl || item.image) }} style={styles.favImage} />
      </View>

      <View style={styles.favInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.favTitle} numberOfLines={2}>{item.name || item.productName}</Text>
          <TouchableOpacity onPress={() => toggleFavorite(item)}>
            <Ionicons name="heart" size={22} color={Colors.status.errorDeep} />
          </TouchableOpacity>
        </View>

        <Text style={styles.skuText}>SKU: {item.sku || ''} | CSI: {item.csi || ''}</Text>

        <View style={styles.priceCartRow}>
          <Text style={styles.favPrice}>₹{safeParsePrice(item.price).toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => {
              const productName = item.name || item.productName || 'Product';
              addToCart({
                ...item,
                id: item._id || item.id,
                name: productName,
                price: safeParsePrice(item.price),
                image: item.imageUrl || item.image,
                selectedVariant: item.selectedVariant || 'Standard',
              });
            }}
          >
            <Ionicons name="cart-outline" size={18} color={Colors.black} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => navigation.navigate('Details', { productId: item.parentProductId || item._id || item.id })}
        >
          <Text style={styles.detailsBtnText}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Favorite Materials</Text>
          <Text style={styles.headerSubtitle}>SAVED ITEMS</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('MainTab', { screen: 'HOME' })} style={styles.headerBtn}>
          <Ionicons name="home-outline" size={24} color={Colors.black} />
        </TouchableOpacity>
      </View>

      {settings && !settings.isServiceEnabled && (
        <OfflineBanner message={settings.offlineMessage} />
      )}

      {loading && favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.black} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={Colors.border.medium} />
          <Text style={styles.emptyText}>No saved items yet.</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('SHOP', { screen: 'ShopPage' })}
          >
            <Text style={styles.browseBtnText}>Browse Materials</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavoriteItem}
          keyExtractor={item => item._id || item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refreshFavorites} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.black },
  headerSubtitle: { fontSize: 10, color: Colors.text.muted, marginTop: 2, letterSpacing: 1, fontWeight: '700' },

  listContent: { padding: 12 },
  row: { justifyContent: 'space-between' },
  favCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginBottom: 16,
    width: (width - 40) / 2,
    borderWidth: 1,
    borderColor: Colors.border.light,
    elevation: 3,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  favImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  favInfo: { padding: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  favTitle: { fontSize: 15, fontWeight: '800', color: Colors.black, flex: 1, marginRight: 4 },
  skuText: { fontSize: 10, color: Colors.text.muted, marginBottom: 12, fontWeight: '500' },

  priceCartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  favPrice: { fontSize: 18, fontWeight: '900', color: Colors.black },
  cartBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  detailsBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border.medium,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  detailsBtnText: { fontSize: 12, fontWeight: '700', color: Colors.text.primary, letterSpacing: 0.5 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: Colors.text.muted, marginTop: 20, marginBottom: 30 },
  browseBtn: { backgroundColor: Colors.black, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  browseBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
});
