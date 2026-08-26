import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Easing,
  ImageBackground
} from 'react-native';

import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../services/api';
import { getFullImageUrl } from '../utils/imageUrl';
import { useAuth, Jobsite } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import LocationModal from '../components/LocationModal';
import OfflineBanner from '../components/OfflineBanner';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/Colors';
import { isServiceOffline as checkServiceOffline } from '../utils/serviceStatus';
import { safeParsePrice } from '../utils/priceUtils';
import { findMatchingJobsite } from '../utils/locationUtils';

const useSpeechRecognitionEvent = (...args: any[]) => {};
const ExpoSpeechRecognitionModule = { requestPermissionsAsync: async () => ({ status: 'granted', granted: true }), startAsync: async () => {}, start: async (...args: any[]) => {}, stop: (...args: any[]) => {} };
const isLoggingOut = false;
const toastConfig = {};
const useTranslation = () => ({ t: (str: string) => str, i18n: { language: 'en', changeLanguage: (...args: any[]) => {} } });
const LANGUAGE_KEY = 'lang';
const { width } = Dimensions.get('window');


const columnWidth = (width - 56) / 4;

interface Brand {
  _id: string;
  name: string;
  logoUrl: string;
}

interface LoyaltyOffer {
  _id: string;
  title: string;
  description?: string;
  offerType: string;
  minAmount: number;
  validityDays?: number;
  imageUrl?: string;
  discount?: string;
  badgeText?: string;
}

interface LoyaltyClaim {
  _id: string;
  offerId: any;
  isCompleted: boolean;
  expiresAt: string;
}

const AutoScrollBrands = ({ brands }: { brands: Brand[] }) => {
  const { i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const scrollX = useRef(new Animated.Value(0)).current;
  const ITEM_WIDTH = 100;
  const totalWidth = brands.length * ITEM_WIDTH;

  useEffect(() => {
    if (!brands || brands.length === 0) return;

    const animation = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -totalWidth,
        duration: brands.length * 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [brands, totalWidth]);

  if (!brands || brands.length === 0) return null;

  const handlePress = (brand: Brand) => {
    navigation.navigate('Shop', {
      screen: 'ShopPage',
      params: {
        brandId: brand._id,
        brandName: brand.name,
      },
    });
  };

  const displayBrands = [...brands, ...brands];

  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.View
        style={{
          flexDirection: 'row',
          transform: [{ translateX: scrollX }],
          width: totalWidth * 2,
        }}
      >
        {displayBrands.map((item, index) => (
          <TouchableOpacity
            key={`${item._id}-${index}`}
            onPress={() => handlePress(item)}
            style={[styles.brandItem, { width: ITEM_WIDTH }]}
          >
            <View style={styles.brandLogoContainer}>
              <Image
                source={{ uri: getFullImageUrl(item.logoUrl) }}
                style={styles.brandLogo}
                contentFit="contain"
                transition={200}
              />
            </View>
            <Text style={styles.brandName} numberOfLines={1}>
              {i18n.language === 'hi' && (item as any).name_hi ? (item as any).name_hi : item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
};

export default function HomeScreen({ navigation }: { navigation: any }) {
  const { t, i18n } = useTranslation();
  const { user, refreshProfile, updateUser } = useAuth();
  const { deliveryAddress, setDeliveryAddress, isManualSelection, setIsManualSelection } = useCart();
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [offers, setOffers] = useState<LoyaltyOffer[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const { settings, refreshSettings, serverTimeOffset } = useSettings();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [selectedLoyaltyOffer, setSelectedLoyaltyOffer] = useState<LoyaltyOffer | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<LoyaltyClaim | null>(null);


  const getNumberWord = (num: number) => {
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
    return words[num] || num.toString();
  };

  const referredCount = settings?.deliveryWaiverRules?.firstOrder?.referredCount ?? 3;
  const referredCountWord = getNumberWord(referredCount);
  const minOrderValue = settings?.deliveryWaiverRules?.firstOrder?.minOrderValue ?? 500;
  const weightCategory = settings?.deliveryWaiverRules?.firstOrder?.maxWeightCategory ?? 'light';

  const [isProcessing, setIsProcessing] = useState(false);
  const transcriptRef = useRef('');
  const [isLocating, setIsLocating] = useState(false);
  const isServiceOffline = React.useMemo(() => checkServiceOffline(settings as any, serverTimeOffset), [settings, serverTimeOffset]);

  const deliveryAddressRef = useRef(deliveryAddress);
  useEffect(() => {
    deliveryAddressRef.current = deliveryAddress;
  }, [deliveryAddress]);



  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setIsProcessing(false);
    transcriptRef.current = '';
    Toast.show({
      type: 'info',
      text1: 'Voice Search',
      text2: 'Listening for materials...',
      visibilityTime: 2000,
      autoHide: true,
    });
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    const finalTranscript = transcriptRef.current;
    if (finalTranscript && finalTranscript.trim()) {
      setIsProcessing(true);
      setShowSuggestions(false);
      Toast.show({
        type: 'success',
        text1: 'Searching Materials',
        text2: `Searching for: ${finalTranscript.trim()}`,
        visibilityTime: 1500,
        autoHide: true,
      });

      // Small delay before API navigation to let the user see the Searching toast
      setTimeout(() => {
        setIsProcessing(false);
        navigation.navigate('Shop', {
          screen: 'ShopPage',
          params: { search: finalTranscript.trim() }
        });
      }, 800);
    } else {
      Toast.show({
        type: 'error',
        text1: "Couldn't hear properly, please try again",
        visibilityTime: 2000,
        autoHide: true,
      });
    }
  });

  useSpeechRecognitionEvent('result', (event: any) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) {
      setSearchQuery(transcript);
      transcriptRef.current = transcript;
    }
  });

  useSpeechRecognitionEvent('error', (event: any) => {
    // Silently log in development, and clear the listening state without displaying any errors on screen
    if (__DEV__) console.log('Speech recognition error:', event.error, event.message);
    setIsListening(false);
    setIsProcessing(false);
  });

  const handleVoiceSearch = async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Permission Denied', 'Microphone access is required for voice search.');
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
    });
  };

  const getTimeLeft = (expiryDate: string) => {
    if (!expiryDate) return '45d 0h left';
    const total = Date.parse(expiryDate) - Date.parse(new Date().toISOString());
    if (total <= 0) return 'Expired';
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    return `${days}d ${hours}h left`;
  };

  const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyDmDT2lO73oKrO3gwJNvFgiJ55vCmrDaIU';

  const autoDetectLocation = async () => {
    if (deliveryAddress || isLocating) return;
    
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (__DEV__) console.log('Location permission not granted');
        setIsLocating(false);
        return;
      }

      let location = await Location.getLastKnownPositionAsync({});
      if (!location) {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      
      const { latitude, longitude } = location.coords;

      // Try Expo's built-in reverse geocoding first (faster, no API key needed)
      try {
        const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (result) {
          const addressText = result.district || result.city || result.name || result.street || "Current Location";
          const matchedSite = findMatchingJobsite(user?.jobsites, latitude, longitude, addressText);
          if (matchedSite) {
            setDeliveryAddress(matchedSite);
          } else if (!deliveryAddressRef.current?._id) {
            // Only set auto-detected address if we don't already have a saved jobsite selected
            setDeliveryAddress({
              addressText: addressText,
              location: { type: 'Point', coordinates: [longitude, latitude] }
            });
          }
          setIsLocating(false);
          return;
        }
      } catch (e) {
        if (__DEV__) console.log('Expo reverse geocode failed, falling back to Google', e);
      }

      // Fallback to Google Maps API
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const components = data.results[0].address_components;
        const subLocality = components.find((c: any) => c.types.includes('sublocality'))?.long_name;
        const locality = components.find((c: any) => c.types.includes('locality'))?.long_name;

        const addressText = (subLocality && locality)
          ? `${subLocality}, ${locality}`
          : data.results[0].formatted_address.split(',').slice(0, 2).join(',');

        const matchedSite = findMatchingJobsite(user?.jobsites, latitude, longitude, addressText);
        if (matchedSite) {
          setDeliveryAddress(matchedSite);
        } else if (!deliveryAddressRef.current?._id) {
          // Only set auto-detected address if we don't already have a saved jobsite selected
          setDeliveryAddress({
            addressText,
            location: { type: 'Point', coordinates: [longitude, latitude] }
          });
        }
      }
    } catch (error) {
      if (__DEV__) console.log('Home location detection failed', error);
    } finally {
      setIsLocating(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, brandRes, offerRes, packageRes] = await Promise.all([
        api.get('/api/products/categories'),
        api.get('/api/products/brands'),
        api.get('/api/products/offers'),
        api.get('/api/packages').catch(err => {
          if (__DEV__) console.log('Error fetching packages', err);
          return { data: { success: true, data: [] } };
        })
      ]);
      setCategories(catRes.data);
      setBrands(brandRes.data);
      setOffers(offerRes.data);
      setPackages(packageRes.data?.success ? packageRes.data.data : []);
      refreshSettings();

      // Fetch active loyalty claim only if user is logged in and not logging out
      if (user && !isLoggingOut) {
        try {
          const { data } = await api.get('/api/loyalty/my-claims');
          const active = data.find((c: LoyaltyClaim) => !c.isCompleted && new Date(c.expiresAt) > new Date());
          setActiveChallenge(active || null);
        } catch (err: any) {
          if (err.response?.status === 404) {
            if (__DEV__) console.log('Loyalty claims endpoint not yet available on this server');
          } else {
            if (__DEV__) console.log('Error fetching loyalty claims', err);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch home data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // If we are currently logging out, don't trigger any new data fetches
    if (isLoggingOut) return;

    fetchData();
    
    // Sync address with user profile if needed
    if (user && user.jobsites && user.jobsites.length > 0) {
      // If no address is set, or the current address is an auto-detected/temp one (no _id)
      // we should prioritize their saved jobsites.
      const isAutoDetected = deliveryAddress && !deliveryAddress._id;
      
      if (!deliveryAddress || isAutoDetected) {
        // If we have auto-detected coords, try to find a matching saved jobsite
        if (deliveryAddress?.location?.coordinates) {
          const [lng, lat] = deliveryAddress.location.coordinates;
          const match = findMatchingJobsite(user.jobsites, lat, lng, deliveryAddress.addressText);
          if (match) {
            setDeliveryAddress(match);
            return;
          }
        }
        
        // Default to the first saved jobsite if nothing is set yet
        if (!deliveryAddress) {
          setDeliveryAddress(user.jobsites[0]);
        }
      }
    } else if (!deliveryAddress && !isLocating) {
      autoDetectLocation();
    }
  }, [user?._id, user?.jobsites?.length, isLoggingOut, deliveryAddress === null]);


  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isSubscribed = true;

    const startLocationTracking = async () => {
      if (isManualSelection) return;
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      try {
        locationSubscription = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.Balanced, 
            timeInterval: 60000, 
            distanceInterval: 100 
          },
          async (location) => {
            if (!isSubscribed) return;
            if (isManualSelection) return;
            const { latitude, longitude } = location.coords;
            
            try {
              let addressText = "Current Location";
              try {
                const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (result) {
                  addressText = result.district || result.city || result.name || result.street || "Current Location";
                }
              } catch (e) { }
              
              const matchedSite = findMatchingJobsite(user?.jobsites, latitude, longitude, addressText);
              
              if (matchedSite) {
                setDeliveryAddress(matchedSite);
              } else {
                setDeliveryAddress({
                  addressText: addressText,
                  location: { type: 'Point', coordinates: [longitude, latitude] }
                });
              }
            } catch (error) {
              if (__DEV__) console.log('Watcher update failed', error);
            }
          }
        );
      } catch (err) {
        if (__DEV__) console.log('Failed to start watcher', err);
      }
    };

    if (!isLoggingOut) {
      startLocationTracking();
    }

    return () => {
      isSubscribed = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isLoggingOut, user?.jobsites, isManualSelection]);


  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length > 1) {
      api.get(`/api/products/autocomplete?q=${encodeURIComponent(text)}`)
        .then(res => {
          setSuggestions(res.data);
          setShowSuggestions(true);
        })
        .catch(err => console.error('Autocomplete error', err));
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const onSearchSubmit = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigation.navigate('Shop', {
        screen: 'ShopPage',
        params: { search: searchQuery.trim() }
      });
    }
  };

  const uploadUserRequest = async (base64: string) => {
    try {
      setUploading(true);
      const payload = {
        name: user?.fullName || 'Mobile User',
        phone: user?.phoneNumber || '9999999999',
        imageBase64: `data:image/jpeg;base64,${base64}`,
        userId: user?._id || user?.id
      };

      const { data } = await api.post('/api/user-requests', payload);
      setAdvancedSearchVisible(false);
      Alert.alert(
        'Request Sent!',
        'Our team will find these materials and add them to your cart soon.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      console.error('[UserRequest Error]', err.response?.data || err.message);
      Alert.alert('Upload Failed', 'Failed to send your request. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your gallery to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      uploadUserRequest(result.assets[0].base64);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your camera to take site notes.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        uploadUserRequest(result.assets[0].base64);
      }
    } catch (err: any) {
      console.error('[Camera Error]', err);
      Alert.alert('Camera Error', `Could not open camera: ${err.message}`);
    }
  };

  const getOfferParams = (off: any) => {
    if (off.brandName) return { brandName: off.brandName };
    if (off.categoryName) return { categoryName: off.categoryName };
    if (off.offerType === 'product' || off.title.toLowerCase().includes('paint')) {
      return { categoryName: 'Paint' };
    }
    return {};
  };

  const handleOfferPress = (offer: any) => {
    if (offer.offerType === 'accumulated') {
      const hasActive = activeChallenge && String(activeChallenge.offerId?._id || activeChallenge.offerId) === String(offer._id);
      if (hasActive) {
        // If already active, just go to shop
        navigation.navigate('Shop', { screen: 'ShopPage' });
        return;
      }
      setSelectedLoyaltyOffer(offer);
      setShowLoyaltyModal(true);
      return;
    }

    const params = getOfferParams(offer);
    navigation.navigate('Shop', {
      screen: 'ShopPage',
      params
    });
  };

  const handleClaimLoyalty = async () => {
    if (!user) {
      setShowLoyaltyModal(false);
      navigation.navigate('Login');
      return;
    }
    try {
      const { data } = await api.post('/api/loyalty/claim', { offerId: selectedLoyaltyOffer?._id });
      if (data.success) {
        Toast.show({ type: 'success', text1: 'Challenge Started!', text2: data.message });
        setShowLoyaltyModal(false);
        fetchData(); // Refresh to get active claim
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to claim challenge');
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      <Modal visible={uploading} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: Colors.ui.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: Colors.white, marginTop: 15, fontSize: 16, fontWeight: 'bold' }}>Sending Request...</Text>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={advancedSearchVisible}
        onRequestClose={() => setAdvancedSearchVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('advancedMaterialSearch')}</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setAdvancedSearchVisible(false)}
              >
                <Ionicons name="close" size={24} color={Colors.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TouchableOpacity
                style={[styles.searchCard, uploading && { opacity: 0.6 }]}
                onPress={handlePickImage}
                disabled={uploading}
              >
                <View style={styles.cardIconBox}>
                  {uploading ? <ActivityIndicator color={Colors.black} /> : <Ionicons name="cloud-upload-outline" size={40} color={Colors.black} />}
                </View>
                <Text style={styles.cardTitle}>{t('uploadImage').split(' ')[0]}</Text>
                <Text style={styles.cardTitle}>{t('uploadImage').split(' ')[1] || ''}</Text>
                <Text style={styles.cardDesc}>{uploading ? 'Uploading...' : 'Handwritten lists or BOQs'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.searchCard, uploading && { opacity: 0.6 }]}
                onPress={handleTakePhoto}
                disabled={uploading}
              >
                <View style={styles.cardIconBox}>
                  {uploading ? <ActivityIndicator color={Colors.black} /> : <Ionicons name="camera-outline" size={40} color={Colors.black} />}
                </View>
                <Text style={styles.cardTitle}>{t('useCamera').split(' ')[0]}</Text>
                <Text style={styles.cardTitle}>{t('useCamera').split(' ')[1] || ''}</Text>
                <Text style={styles.cardDesc}>{uploading ? 'Capturing...' : 'Capture site notes live'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showLoyaltyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.loyaltyModalContent}>
            <View style={styles.loyaltyModalHeader}>
              <View style={styles.loyaltyIconCircle}>
                <Ionicons name="gift" size={32} color={Colors.black} />
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
                <Text style={styles.loyaltyDetailText}>The timer starts the moment you click "Claim Offer".</Text>
              </View>

              <View style={styles.loyaltyDisclaimer}>
                <Text style={styles.loyaltyDisclaimerText}>*Delivery of reward items within 15 days of qualification.</Text>
              </View>

              <TouchableOpacity style={styles.loyaltyClaimBtn} onPress={handleClaimLoyalty}>
                <Text style={styles.loyaltyClaimBtnText}>{user ? 'Claim This Offer' : 'Login to Claim'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelectAddress={(address, coords, extraDetails) => {
          if (__DEV__) console.log('[Home] Selected Address:', address);
          
          const manualVal = extraDetails?.isManual !== undefined ? extraDetails.isManual : true;
          setIsManualSelection(manualVal);

          if (extraDetails?.jobsite) {
            setDeliveryAddress(extraDetails.jobsite);
          } else {
            // Try to match with existing jobsites
            const matchedSite = findMatchingJobsite(user?.jobsites, coords.latitude, coords.longitude, address);
            
            if (matchedSite) {
              setDeliveryAddress(matchedSite);
            } else {
              setDeliveryAddress({
                addressText: address,
                location: { type: 'Point', coordinates: [coords.longitude, coords.latitude] },
                pincode: extraDetails?.pincode,
                city: extraDetails?.city,
                name: extraDetails?.name,
                contactPhone: extraDetails?.contactPhone
              });
            }
          }
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isServiceOffline && (
          <OfflineBanner message={settings?.offlineMessage} />
        )}


        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.logo, { overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }]}>
              <Image
                source={require('../../assets/app-icon-v2.png')}
                style={{ width: '100%', height: '100%', transform: [{ scale: 1.8 }] }}
                contentFit="contain"
              />
            </View>
            <TouchableOpacity
              style={styles.locationSelector}
              onPress={() => setLocationModalVisible(true)}
            >
              <Ionicons name="location" size={14} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.detectingText} numberOfLines={1}>
                {deliveryAddress?.name || deliveryAddress?.addressText || (isLocating ? 'Detecting...' : 'Current Location')}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            {user?.isAffiliate && (
              <TouchableOpacity
                style={styles.affiliateWalletHeader}
                onPress={() => navigation.navigate('AffiliateWallet')}
              >
                <Ionicons name="wallet-outline" size={15} color="#B7791F" style={{ marginRight: 4 }} />
                <Text style={styles.walletBalanceText}>{Number(user.walletBalance || 0).toFixed(2)} pts</Text>
              </TouchableOpacity>
            )}

            {false && (
              <TouchableOpacity
                style={styles.profileIcon}
                onPress={() => {
                  const newLang = i18n.language === 'en' ? 'hi' : 'en';
                  i18n.changeLanguage(newLang);
                  AsyncStorage.setItem(LANGUAGE_KEY, newLang);
                }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 14, color: Colors.black }}>
                  {i18n.language === 'en' ? 'A/अ' : 'A/अ'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.profileIcon}
              onPress={() => {
                if (user) {
                  navigation.navigate('Profile');
                } else {
                  Toast.show({
                    type: 'info',
                    text1: t('toastLoginRequired'),
                    text2: t('toastLoginRequiredMsg'),
                  });
                  navigation.navigate('Login', { returnTo: 'MainTab' });
                }
              }}
            >
              {user?.profileImage ? (
                <Image source={{ uri: getFullImageUrl(user.profileImage) }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" transition={200} />
              ) : (
                <Ionicons name="person" size={24} color={Colors.black} />
              )}
              {user?.isAffiliate && (
                <View style={styles.crownBadge}>
                  <MaterialCommunityIcons name="crown" size={10} color={Colors.black} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={{ flex: 1, position: 'relative' }}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={Colors.text.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor={Colors.text.secondary}
                value={searchQuery}
                onChangeText={handleSearch}
                onSubmitEditing={onSearchSubmit}
              />
              <View style={styles.searchActions}>
                <TouchableOpacity onPress={handleVoiceSearch} disabled={isProcessing}>
                  <Ionicons
                    name={isListening ? "mic" : "mic-outline"}
                    size={20}
                    color={isListening ? Colors.status.error : isProcessing ? Colors.text.muted : Colors.text.secondary}
                    style={styles.searchActionIcon}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  if (user) {
                    setAdvancedSearchVisible(true);
                  } else {
                    navigation.navigate('Login');
                  }
                }}>
                  <Ionicons name="camera-outline" size={20} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            {showSuggestions && (
              <Pressable
                style={{
                  position: 'absolute',
                  top: 0,
                  left: -50,
                  right: -50,
                  bottom: -1500,
                  backgroundColor: 'transparent',
                  zIndex: 999,
                }}
                onPress={() => setShowSuggestions(false)}
              />
            )}

            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setShowSuggestions(false);
                      setSearchQuery('');
                      navigation.navigate('Shop', { screen: 'Details', params: { productId: item._id } });
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: Colors.black }} numberOfLines={1}>{item.productName || item.name}</Text>
                        <Text style={{ fontSize: 12, color: Colors.text.secondary }} numberOfLines={1}>{item.brand}</Text>
                      </View>
                      <View style={{ flexShrink: 0 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: Colors.status.success }}>₹{safeParsePrice(item.price).toFixed(2)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => {
              if (user) {
                navigation.navigate('Shop', { screen: 'Favorites' });
              } else {
                Toast.show({
                  type: 'info',
                  text1: t('toastLoginRequired'),
                  text2: t('toastLoginRequiredMsg'),
                });
                navigation.navigate('Login');
              }
            }}
          >
            <Ionicons name="heart-outline" size={24} color={Colors.status.error} />
          </TouchableOpacity>
        </View>

        {loading && categories.length === 0 ? (
          <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.black} />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <View style={styles.categoryGrid}>
                {categories.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.categoryCard}
                    onPress={() => navigation.navigate('Shop', {
                      screen: 'ShopPage',
                      params: {
                        categoryId: item._id,
                        categoryName: item.name
                      }
                    })}
                  >
                    <Image
                      source={{ uri: getFullImageUrl(item.imageUrl) }}
                      style={styles.categoryImage}
                      contentFit="cover"
                      transition={300}
                    />
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName} numberOfLines={2}>
                        {i18n.language === 'hi' && item.name_hi ? item.name_hi : item.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
 
            {false && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('rentalPackagePlans')}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 16, paddingBottom: 8 }}
                >
                  {packages.map((pkg) => (
                    <TouchableOpacity
                      key={pkg._id}
                      style={styles.packageCard}
                      onPress={() => navigation.navigate('PackageDetails', { id: pkg._id })}
                    >
                      <ImageBackground
                        source={{ 
                          uri: pkg.bannerImage 
                            ? getFullImageUrl(pkg.bannerImage) 
                            : 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecb?auto=format&fit=crop&q=80&w=400' 
                        }}
                        style={styles.packageCardBg}
                        imageStyle={styles.packageCardImg}
                      >
                        <View style={styles.packageCardOverlay}>
                          <View style={styles.packageBadge}>
                            <Text style={styles.packageBadgeText}>
                              {i18n.language === 'hi' && pkg.packageType_hi ? pkg.packageType_hi : pkg.packageType}
                            </Text>
                          </View>
                          <Text style={styles.packageTitle} numberOfLines={1}>
                            {i18n.language === 'hi' && pkg.name_hi ? pkg.name_hi : pkg.name}
                          </Text>
                          <Text style={styles.packageDesc} numberOfLines={2}>
                            {i18n.language === 'hi' && pkg.description_hi ? pkg.description_hi : pkg.description}
                          </Text>
                          
                          <View style={styles.packageBenefitsRow}>
                            {pkg.freeDelivery && (
                              <View style={styles.packageBenefitTag}>
                                <Ionicons name="bus-outline" size={10} color={Colors.white} />
                                <Text style={styles.packageBenefitTagText}>{t('freeDelivery')}</Text>
                              </View>
                            )}
                            {pkg.freeInstallation && (
                              <View style={styles.packageBenefitTag}>
                                <Ionicons name="build-outline" size={10} color={Colors.white} />
                                <Text style={styles.packageBenefitTagText}>{t('freeSetup')}</Text>
                              </View>
                            )}
                            {pkg.cashDiscount !== undefined && pkg.cashDiscount > 0 && (
                              <View style={[styles.packageBenefitTag, { backgroundColor: '#10B981' }]}>
                                <Ionicons name="cash-outline" size={10} color={Colors.white} />
                                <Text style={styles.packageBenefitTagText}>₹{pkg.cashDiscount} Off 💰</Text>
                              </View>
                            )}
                            <View style={[styles.packageBenefitTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                              <Ionicons name="layers-outline" size={10} color={Colors.white} />
                              <Text style={styles.packageBenefitTagText}>{pkg.items?.length || 0} Steps</Text>
                            </View>
                          </View>

                          <View style={styles.packageActionRow}>
                            <Text style={styles.packageCtaText}>{t('configurePackage')}</Text>
                            <Ionicons name="arrow-forward-circle" size={18} color={Colors.primary} />
                          </View>
                        </View>
                      </ImageBackground>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {brands.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Shop by Brand</Text>
                <AutoScrollBrands brands={brands} />
              </View>
            )}

            {false && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('offers')}</Text>
                {offers.map((offer) => {
                  const isLoyalty = offer.offerType === 'accumulated';
                  const hasActiveThisChallenge = activeChallenge && String(activeChallenge.offerId?._id || activeChallenge.offerId) === String(offer._id);

                  return (
                    <TouchableOpacity
                      key={offer._id}
                      style={[styles.offerCard, { marginBottom: 15 }]}
                      onPress={() => handleOfferPress(offer)}
                    >
                      <Image
                        source={{ uri: getFullImageUrl(offer.imageUrl) }}
                        style={styles.offerImage}
                        contentFit="cover"
                        transition={500}
                      />
                      <View style={styles.offerOverlay}>
                        <View style={styles.offerBadge}>
                          <Text style={styles.offerBadgeText}>
                            {i18n.language === 'hi' && (offer as any).discount_hi ? (offer as any).discount_hi : (offer.discount || offer.badgeText || t('specialOffer'))}
                          </Text>
                        </View>
                        <Text style={styles.offerTitle} numberOfLines={1}>
                          {isLoyalty ? t('Partner Loyalty Challenge') : (i18n.language === 'hi' && (offer as any).title_hi ? (offer as any).title_hi : offer.title)}
                        </Text>

                        <View style={styles.offerDetailsContainer}>
                          {offer.minAmount > 0 && (
                            <View style={styles.offerDetailItem}>
                              <Ionicons name="cart-outline" size={14} color="rgba(255,255,255,0.9)" />
                              <Text style={styles.offerDetailText}>{t('Min. Order:')} ₹{offer.minAmount.toLocaleString()}</Text>
                            </View>
                          )}
                          {(offer.validityDays || isLoyalty) && (
                            <View style={styles.offerDetailItem}>
                              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.9)" />
                              <Text style={styles.offerDetailText}>
                                {offer.validityDays ? `${offer.validityDays} ${t('Days')}` : t('Limited Period')}
                              </Text>
                            </View>
                          )}
                        </View>

                        {offer.description && (
                          <Text style={styles.offerSubTitle} numberOfLines={2}>
                            {i18n.language === 'hi' && (offer as any).description_hi ? (offer as any).description_hi : offer.description}
                          </Text>
                        )}

                        {isLoyalty ? (
                          hasActiveThisChallenge ? (
                            <View style={styles.activeLoyaltyContainer}>
                              <View style={styles.activeTimerBadge}>
                                <Ionicons name="timer-outline" size={14} color={Colors.white} />
                                <Text style={styles.activeTimerText}>{getTimeLeft(activeChallenge.expiresAt)}</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.activeShopBtn}
                                onPress={() => navigation.navigate('Shop', { screen: 'ShopPage' })}
                              >
                                <Text style={styles.activeShopBtnText}>{t('shopNow')}</Text>
                                <Ionicons name="chevron-forward" size={12} color={Colors.black} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.shopNowSmallBtn}
                              onPress={() => handleOfferPress(offer)}
                            >
                              <Text style={styles.shopNowSmallText}>{t('viewDealClaim')}</Text>
                            </TouchableOpacity>
                          )
                        ) : (
                          <TouchableOpacity
                            style={styles.shopNowSmallBtn}
                            onPress={() => handleOfferPress(offer)}
                          >
                            <Text style={styles.shopNowSmallText}>{t('shopNow')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}


        <View style={{ height: 40 }} />
      </ScrollView>
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
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 32, height: 32, borderRadius: 6, marginRight: 10, backgroundColor: Colors.secondary },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: 220,
  },
  detectingText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    marginRight: 4,
    maxWidth: 160,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  crownBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FFE100',
    borderRadius: 7,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    zIndex: 100, // Ensure suggestions appear on top
    elevation: 100, // Android support
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.ui.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    width: '100%',
    maxHeight: '80%',
    borderRadius: 35,
    padding: 20,
    elevation: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.border.light,
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 48,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: Colors.black,
  },
  searchActions: { flexDirection: 'row', alignItems: 'center' },
  searchActionIcon: { marginRight: 10 },
  heartBtn: { padding: 4 },
  suggestionsList: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF', // Solid white
    borderRadius: 16,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    zIndex: 10000, // Higher z-index
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: { paddingHorizontal: 16, marginBottom: 25 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text.primary, marginBottom: 15 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  categoryCard: {
    width: columnWidth,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  categoryImage: { width: '100%', height: 80 },
  categoryInfo: { paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 11, fontWeight: '700', textAlign: 'center', color: Colors.black },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  shopNowText: { fontSize: 12, fontWeight: '700', color: Colors.black, marginRight: 4 },
  brandItem: { alignItems: 'center', marginRight: 20 },
  brandLogoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: Colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginBottom: 8,
  },
  brandLogo: { width: 50, height: 50 },
  brandName: { fontSize: 11, fontWeight: '600', color: Colors.text.muted },
  offerCard: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
  },
  offerImage: { width: '100%', height: '100%' },
  offerOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0,0,0,0.35)', // Darker overlay for better contrast
    padding: 16,
    justifyContent: 'center',
  },
  offerBadge: {
    backgroundColor: Colors.status.errorDeep,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  offerBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '800' },
  offerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    width: '90%',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  offerDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  offerDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  offerDetailText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
  },
  offerSubTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    fontWeight: '600',
    width: '85%',
  },
  shopNowSmallBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  shopNowSmallText: { color: Colors.black, fontSize: 11, fontWeight: '900' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: Colors.black,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginRight: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  modalBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  searchCard: {
    width: '47%',
    height: 250,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.status.info,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
  },
  cardIconBox: {
    marginBottom: 20,
    backgroundColor: Colors.background.info,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.black,
    textAlign: 'center',
    lineHeight: 22,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Loyalty Modal
  loyaltyModalContent: {
    backgroundColor: Colors.white,
    width: '90%',
    borderRadius: 30,
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
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
  activeLoyaltyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  activeTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 10,
  },
  activeTimerText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.white,
    marginLeft: 6,
  },
  activeShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  activeShopBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.black,
    marginRight: 4,
  },
  packageCard: {
    width: 280,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  packageCardBg: {
    width: '100%',
    height: '100%',
  },
  packageCardImg: {
    opacity: 0.45,
    backgroundColor: Colors.secondary,
  },
  packageCardOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 16,
    justifyContent: 'space-between',
  },
  packageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.black,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  packageBadgeText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  packageDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    lineHeight: 15,
  },
  packageBenefitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  packageBenefitTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  packageBenefitTagText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  packageActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageCtaText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  affiliateWalletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  walletBalanceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B7791F',
  },
});

