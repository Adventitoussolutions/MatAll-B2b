import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from '../components/MapViewWrapper';

const { width, height } = Dimensions.get('window');

export default function LocationSelectionScreen({ navigation, route }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<any>(null);

  const [markerCoordinate, setMarkerCoordinate] = useState({
    latitude: 28.4231,
    longitude: 77.0822,
  });
  const [selectedAddressText, setSelectedAddressText] = useState('Gurugram, Haryana');
  
  const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleSearchChange = async (text: string) => {
    setSearchTerm(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (text.length > 2 && GOOGLE_API_KEY) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}&components=country:in`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.status === 'OK') {
            setSuggestions(data.predictions || []);
          } else {
            setSuggestions([]);
          }
        } catch (error) {
          console.error('[Location] Autocomplete error:', error);
        }
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = async (suggestion: any) => {
    setSuggestions([]);
    setSearchTerm(suggestion.description);
    setIsLoadingAddress(true);
    
    if (!GOOGLE_API_KEY) {
      setIsLoadingAddress(false);
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.result && data.result.geometry) {
        const { lat, lng } = data.result.geometry.location;
        const newCoords = { latitude: lat, longitude: lng };
        setMarkerCoordinate(newCoords);
        setSelectedAddressText(data.result.formatted_address);

        mapRef.current?.animateToRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }
    } catch (error) {
      console.error('[Location] Suggestion details error:', error);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!GOOGLE_API_KEY) return;
    
    setIsLoadingAddress(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        setSelectedAddressText(address);
        setSearchTerm(address);
      } else {
        setSelectedAddressText('Coordinates selected, address not resolved.');
      }
    } catch (error) {
      console.error('[Location] Geocoding error:', error);
      setSelectedAddressText('Network error fetching address');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access was denied. Using default coordinates.');
        setIsLocating(false);
        return;
      }

      let location = await Location.getLastKnownPositionAsync({});
      if (!location) {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      
      const { latitude, longitude } = location.coords;
      const newCoords = { latitude, longitude };
      setMarkerCoordinate(newCoords);
      reverseGeocode(latitude, longitude);

      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    handleUseCurrentLocation();
  }, []);

  const handleConfirmLocation = () => {
    navigation.navigate({
      name: 'MainTabs',
      params: {
        screen: 'Profile',
        params: {
          selectedLocation: selectedAddressText,
          selectedLatitude: markerCoordinate.latitude,
          selectedLongitude: markerCoordinate.longitude
        }
      },
      merge: true
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Location</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Pinpoint your location on the map. This helps us accurately process your onboarding.
          </Text>

          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for area, street name..."
              value={searchTerm}
              onChangeText={handleSearchChange}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchTerm(''); setSuggestions([]); }}>
                <Ionicons name="close-circle" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestionsList}>
              {suggestions.map((item) => (
                <TouchableOpacity key={item.place_id} style={styles.suggestionItem} onPress={() => selectSuggestion(item)}>
                  <Ionicons name="location" size={18} color="#6366F1" />
                  <View style={styles.suggestionTextContent}>
                    <Text style={styles.suggestionMainText} numberOfLines={1}>{item.structured_formatting?.main_text}</Text>
                    <Text style={styles.suggestionSubText} numberOfLines={1}>{item.structured_formatting?.secondary_text}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.currentLocRow} onPress={handleUseCurrentLocation} disabled={isLocating}>
            <Ionicons name="navigate-outline" size={20} color="#000" />
            <Text style={styles.currentLocText}>
              {isLocating ? "Locating..." : "Use current location"}
            </Text>
          </TouchableOpacity>

          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                ...markerCoordinate,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={(e: any) => {
                const coords = e.nativeEvent.coordinate;
                setMarkerCoordinate(coords);
                reverseGeocode(coords.latitude, coords.longitude);
              }}
            >
              <Marker
                draggable
                coordinate={markerCoordinate}
                onDragEnd={(e: any) => {
                  const coords = e.nativeEvent.coordinate;
                  setMarkerCoordinate(coords);
                  reverseGeocode(coords.latitude, coords.longitude);
                }}
              />
            </MapView>
            <View style={styles.mapOverlayHint}>
              <Ionicons name="location" size={14} color="#EF4444" />
              <Text style={styles.mapOverlayHintText}>Move map to adjust pin</Text>
            </View>
          </View>

          <View style={styles.addressPreview}>
            <Ionicons name="location" size={24} color="#EF4444" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.previewLabel}>SELECTED LOCATION</Text>
              {isLoadingAddress ? (
                <View style={styles.skeletonContainer}>
                  <ActivityIndicator color="#000" size="small" />
                  <Text style={styles.skeletonText}>Resolving address coordinates...</Text>
                </View>
              ) : (
                <Text style={styles.previewText} numberOfLines={2}>{selectedAddressText}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, isLoadingAddress && { opacity: 0.6 }]}
            onPress={handleConfirmLocation}
            disabled={isLoadingAddress}
          >
            <Text style={styles.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#000', letterSpacing: 1.2 },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 450,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  subtitle: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 16 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#000' },
  suggestionsList: {
    position: 'absolute',
    top: 130,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 1000,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  suggestionTextContent: { flex: 1, marginLeft: 12 },
  suggestionMainText: { fontSize: 14, color: '#1E293B', fontWeight: '700' },
  suggestionSubText: { fontSize: 12, color: '#64748B' },
  currentLocRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  currentLocText: { marginLeft: 10, fontSize: 15, fontWeight: '700' },
  addressPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewLabel: { fontSize: 10, fontWeight: '900', color: '#64748B' },
  previewText: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  skeletonContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  skeletonText: { fontSize: 13, color: '#64748B' },
  confirmBtn: { backgroundColor: '#000', padding: 18, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: '#FFE600', fontSize: 16, fontWeight: '900' },
  mapContainer: { height: 250, borderRadius: 15, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  map: { width: '100%', height: '100%' },
  mapOverlayHint: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapOverlayHintText: { fontSize: 10, fontWeight: '800', color: '#1E293B', marginLeft: 4 },
});
