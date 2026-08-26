import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useAuth, User, Jobsite } from '../context/AuthContext';
import api from '../services/api';
import Toast from 'react-native-toast-message';

import MapView, { Marker, Polygon } from './MapViewWrapper';

const { width, height } = Dimensions.get('window');

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAddress: (address: string, coords: { latitude: number; longitude: number }, extraDetails?: { pincode?: string; city?: string; name?: string; contactPhone?: string; jobsite?: Jobsite; isManual?: boolean }) => void;
}

export default function LocationModal({ visible, onClose, onSelectAddress }: LocationModalProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, updateUser, refreshProfile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Decision, 2: Search/Map, 3: Form
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  interface Geofence {
    _id: string;
    name: string;
  }

  // Map state
  const [markerCoordinate, setMarkerCoordinate] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
  });
  const [selectedAddressText, setSelectedAddressText] = useState('Detecting location...');
  const [isServiceable, setIsServiceable] = useState(true);
  const [activeGeofences, setActiveGeofences] = useState<any[]>([]);

  // Form state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderingFor, setOrderingFor] = useState<'Yourself' | 'Someone else'>('Yourself');
  const [addrType, setAddrType] = useState<'Home' | 'Office' | 'Site' | 'Other'>('Home');
  const [houseNumber, setHouseNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [apartmentName, setApartmentName] = useState('');
  const [tower, setTower] = useState('');
  const [landmark, setLandmark] = useState('');
  const [recipientName, setRecipientName] = useState(user?.fullName || '');
  const [recipientPhone, setRecipientPhone] = useState(user?.phoneNumber || '');
  const [pincode, setPincode] = useState('');
  const [isPincodeEditable, setIsPincodeEditable] = useState(false);
  const [city, setCity] = useState('');
  const [editingAddress, setEditingAddress] = useState<Jobsite | null>(null);

  const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Reset modal when opened
  useEffect(() => {
    if (visible) {
      setStep(1);
      setSearchTerm('');
      setSuggestions([]);
      setOrderingFor('Yourself');
      setAddrType('Home');
      setHouseNumber('');
      setFloor('');
      setApartmentName('');
      setTower('');
      setLandmark('');
      setRecipientName(user?.fullName || '');
      setRecipientPhone(user?.phoneNumber || '');
      setPincode('');
      setIsPincodeEditable(false);
      setCity('');
      fetchGeofences();
      if (user) {
        refreshProfile();
      }
      // Silently fetch current location on open
      autoDetectLocation();
      setErrors({});
    }
  }, [visible]);

  const resetForm = () => {
    setEditingAddress(null);
    setOrderingFor('Yourself');
    setAddrType('Home');
    setHouseNumber('');
    setFloor('');
    setApartmentName('');
    setTower('');
    setLandmark('');
    setRecipientName(user?.fullName || '');
    setRecipientPhone(user?.phoneNumber || '');
    setPincode('');
    setIsPincodeEditable(false);
    setCity('');
    setErrors({});
  };

  const autoDetectLocation = async () => {
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setMarkerCoordinate({ latitude, longitude });
      reverseGeocode(latitude, longitude);
    } catch (error) {
      if (__DEV__) console.log('Auto-location detection failed', error);
    }
  };

  const fetchGeofences = async () => {
    try {
      const { data } = await api.get('/api/location/active-geofences');
      setActiveGeofences(data);
    } catch (err) {
      console.error('Failed to fetch geofences', err);
    }
  };

  const checkServiceability = async (lat: number, lng: number) => {
    try {
      if (!activeGeofences || activeGeofences.length === 0) {
        setIsServiceable(true);
        return true;
      }
      const { data } = await api.post('/api/location/check-coordinates', { lat, lng });
      let isServ = data.serviceable;

      if (__DEV__) console.log(`[SERVICEABILITY]: ${isServ ? '✅ TRUE' : '❌ FALSE'} | Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);

      setIsServiceable(isServ);
      if (!isServ) {
        // Use Alert for Modal because Toast can sometimes be hidden behind it
        Alert.alert(
          "Not Serviceable",
          "We don't deliver to this area yet. We're expanding fast and will be here soon!",
          [{ text: "OK" }]
        );
      }
      return isServ;
    } catch (err) {
      console.error('Serviceability check failed', err);
      setIsServiceable(false);
      return false;
    }
  };

  const handleSearchChange = async (text: string) => {
    setSearchTerm(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (text.length > 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}&components=country:in`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.status === 'OK') {
            setSuggestions(data.predictions || []);
          } else {
            console.warn('[LocationModal] Autocomplete API Error:', data.status, data.error_message);
            setSuggestions([]);
          }
        } catch (error) {
          console.error('[LocationModal] Autocomplete Network Error:', error);
        }
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = async (suggestion: any) => {
    setSuggestions([]);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.result && data.result.geometry) {
        const { lat, lng } = data.result.geometry.location;
        
        // Check serviceability FIRST before selecting
        const isServ = await checkServiceability(lat, lng);
        if (!isServ) {
          setSearchTerm('');
          return;
        }

        const newCoords = { latitude: lat, longitude: lng };
        setMarkerCoordinate(newCoords);
        const address = data.result.formatted_address;
        setSelectedAddressText(address);
        setSearchTerm(address);

        // Extract pincode and city
        const components = data.result.address_components;
        const pin = components.find((c: any) => c.types.includes('postal_code'))?.long_name || '';
        const cleanPin = pin.replace(/\D/g, '').slice(0, 6);
        const cityVal = components.find((c: any) => c.types.includes('locality'))?.long_name || '';
        setPincode(cleanPin);
        setCity(cityVal);

        mapRef.current?.animateToRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      } else {
        console.warn('[LocationModal] Place Details API Error:', data.status, data.error_message);
      }
    } catch (error) {
      console.error('[LocationModal] Place Details Network error:', error);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setSelectedAddressText('Fetching address...');
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        setSelectedAddressText(address);
        setSearchTerm(address);

        let pin = '';
        let cityVal = '';

        for (const result of data.results) {
          const components = result.address_components;
          if (!pin) {
            const foundPin = components.find((c: any) => c.types.includes('postal_code'))?.long_name;
            if (foundPin) pin = foundPin;
          }
          if (!cityVal) {
            const foundCity = components.find((c: any) => c.types.includes('locality'))?.long_name;
            if (foundCity) cityVal = foundCity;
          }
          if (pin && cityVal) break;
        }

        const cleanPin = pin.replace(/\D/g, '').slice(0, 6);
        setPincode(cleanPin);
        setCity(cityVal);

        return await checkServiceability(lat, lng);
      } else {
        console.warn('[LocationModal] Geocoding API Error:', data.status, data.error_message);
        setSelectedAddressText('Location found, but address could not be fetched');
        return false;
      }
    } catch (error) {
      console.error('[LocationModal] Geocoding Network error:', error);
      setSelectedAddressText('Network error fetching address');
      return false;
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    resetForm();
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        return;
      }

      let location = await Location.getLastKnownPositionAsync({});
      if (!location) {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      const { latitude, longitude } = location.coords;
      const newCoords = { latitude, longitude };
      setMarkerCoordinate(newCoords);
      const isServ = await reverseGeocode(latitude, longitude);
      if (!isServ) {
        setStep(1);
        return;
      }

      // Match saved coordinates
      let matchedSavedAddress: Jobsite | null = null;
      if (user?.jobsites && user.jobsites.length > 0) {
        const toRad = (v: number) => (v * Math.PI) / 180;
        for (const site of user.jobsites) {
          let lat = 0, lng = 0;
          if (site.location && site.location.coordinates) {
            lng = site.location.coordinates[0];
            lat = site.location.coordinates[1];
          } else if (site.coordinates) {
            lat = site.coordinates.latitude || 0;
            lng = site.coordinates.longitude || 0;
          }

          if (lat && lng) {
            // Haversine distance
            const R = 6371e3;
            const dLat = toRad(lat - latitude);
            const dLon = toRad(lng - longitude);
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(latitude)) *
              Math.cos(toRad(lat)) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance <= 50) { // Matching saved within 50m
              matchedSavedAddress = site;
              break;
            }
          }
        }
      }

      if (matchedSavedAddress) {
        const addr = matchedSavedAddress.addressText || matchedSavedAddress.address || '';
        let matchedCoords = { latitude: 0, longitude: 0 };
        if (matchedSavedAddress.location && matchedSavedAddress.location.coordinates) {
          matchedCoords.longitude = matchedSavedAddress.location.coordinates[0];
          matchedCoords.latitude = matchedSavedAddress.location.coordinates[1];
        } else if (matchedSavedAddress.coordinates) {
          matchedCoords.latitude = matchedSavedAddress.coordinates.latitude || 0;
          matchedCoords.longitude = matchedSavedAddress.coordinates.longitude || 0;
        }

        Toast.show({
          type: 'success',
          text1: 'Welcome back!',
          text2: `Using your saved address: ${matchedSavedAddress.name || matchedSavedAddress.recipientName || 'Saved Location'}`,
          visibilityTime: 1200,
          autoHide: true,
        });

        setTimeout(() => {
          Toast.hide();
          onSelectAddress(addr, matchedCoords, {
            pincode: matchedSavedAddress?.pincode,
            city: matchedSavedAddress?.city,
            name: matchedSavedAddress?.name,
            contactPhone: matchedSavedAddress?.contactPhone,
            jobsite: matchedSavedAddress,
            isManual: false
          });
          onClose();
        }, 1200);
        return;
      }

      if (step === 1) {
        setStep(3); // Go directly to form
      }
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!isServiceable) {
      Alert.alert('Not Serviceable', "We don't deliver to this area yet. Please select a different location.");
      return;
    }

    const newErrors: Record<string, string> = {};
    if (!houseNumber) newErrors.houseNumber = 'Required';
    if (!apartmentName) newErrors.apartmentName = 'Required';
    if (!landmark) newErrors.landmark = 'Required';
    if (!recipientName) newErrors.recipientName = 'Required';
    if (!recipientPhone) newErrors.recipientPhone = 'Required';
    if (!pincode) newErrors.pincode = 'Required';
    else if (pincode.length !== 6) newErrors.pincode = 'Invalid';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Missing Details', 'Please fill in all required fields correctly.');
      return;
    }

    setLoading(true);
    try {
      const formattedAddress = `${houseNumber}, ${floor ? 'Floor ' + floor + ', ' : ''}${tower ? tower + ', ' : ''}${apartmentName ? apartmentName + ', ' : ''}${selectedAddressText}${landmark ? ' (Near ' + landmark + ')' : ''}`;

      const newJobsite = {
        name: recipientName,
        addressType: addrType,
        addressText: formattedAddress,
        contactPhone: recipientPhone,
        pincode: pincode,
        city: city,
        houseNumber: houseNumber,
        floor: floor,
        tower: tower,
        apartmentName: apartmentName,
        landmark: landmark,
        location: {
          type: 'Point',
          coordinates: [markerCoordinate.longitude, markerCoordinate.latitude]
        }
      };

      if (!user) {
        onClose();
        navigation.navigate('Login');
        return;
      }

      let updatedJobsites;
      if (editingAddress) {
        // Update existing jobsite
        updatedJobsites = (user.jobsites || []).map((item: any) => 
          item._id === editingAddress._id ? { ...newJobsite, _id: editingAddress._id } : item
        );
      } else {
        // Add new jobsite
        updatedJobsites = [...(user.jobsites || []), newJobsite];
      }

      const { data } = await api.put('/api/auth/profile', { jobsites: updatedJobsites });

      const updatedUser = data.user || data;
      if (updatedUser) {
        await updateUser(updatedUser);
      }

      let savedJobsite: Jobsite | undefined = undefined;
      if (updatedUser && updatedUser.jobsites) {
        if (editingAddress) {
          savedJobsite = updatedUser.jobsites.find((site: any) => site._id === editingAddress._id);
        } else {
          savedJobsite = updatedUser.jobsites.find((site: any) => 
            site.location?.coordinates && 
            Math.abs(site.location.coordinates[0] - markerCoordinate.longitude) < 0.0001 &&
            Math.abs(site.location.coordinates[1] - markerCoordinate.latitude) < 0.0001
          ) || updatedUser.jobsites[updatedUser.jobsites.length - 1];
        }
      }

      onSelectAddress(formattedAddress, markerCoordinate, {
        pincode,
        city,
        name: recipientName,
        contactPhone: recipientPhone,
        jobsite: savedJobsite,
        isManual: true
      });
      onClose();
    } catch (error) {
      console.error('Save address error:', error);
      Alert.alert('Error', 'Could not save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (site: Jobsite) => {
    setEditingAddress(site);
    setRecipientName(site.name || '');
    setAddrType((site.addressType as any) || 'Home');
    setRecipientPhone(site.contactPhone || '');
    setPincode(site.pincode || '');
    setIsPincodeEditable(!site.pincode);
    setCity(site.city || '');
    setOrderingFor(site.name === user?.fullName ? 'Yourself' : 'Someone else');

    // Use granular fields if they exist
    if (site.houseNumber || site.landmark || site.apartmentName) {
      setHouseNumber(site.houseNumber || '');
      setFloor(site.floor || '');
      setTower(site.tower || '');
      setApartmentName(site.apartmentName || '');
      setLandmark(site.landmark || '');
      
      // For selectedAddressText, we need the base part. 
      // Usually, it's the part after houseNumber, floor, tower, apartmentName in addressText.
      // But a safer way is to use the addressText and remove the known parts.
      let baseAddr = site.addressText || '';
      if (site.landmark) baseAddr = baseAddr.replace(` (Near ${site.landmark})`, '');
      if (site.apartmentName) baseAddr = baseAddr.replace(`${site.apartmentName}, `, '');
      if (site.tower) baseAddr = baseAddr.replace(`${site.tower}, `, '');
      if (site.floor) baseAddr = baseAddr.replace(`Floor ${site.floor}, `, '');
      if (site.houseNumber) baseAddr = baseAddr.replace(`${site.houseNumber}, `, '');
      setSelectedAddressText(baseAddr.trim());
    } else {
      // Fallback for older addresses: parse from addressText
      let addrText = site.addressText || '';
      
      const landmarkMatch = addrText.match(/\(Near (.*?)\)/);
      if (landmarkMatch) {
        setLandmark(landmarkMatch[1]);
        addrText = addrText.replace(landmarkMatch[0], '').trim();
        if (addrText.endsWith(',')) addrText = addrText.slice(0, -1).trim();
      }
      
      const parts = addrText.split(',').map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length > 0) {
        setHouseNumber(parts[0]);
        let currentIdx = 1;
        
        if (parts.length > currentIdx && parts[currentIdx].startsWith('Floor ')) {
          setFloor(parts[currentIdx].replace('Floor ', ''));
          currentIdx++;
        }
        
        // Strategy: Base address usually has at least 3 parts (e.g. City, State, Country)
        // If we have more than 3 parts remaining, the first few are likely Tower and Apartment.
        const remainingPartsCount = parts.length - currentIdx;
        
        if (remainingPartsCount >= 5) {
          setTower(parts[currentIdx]);
          setApartmentName(parts[currentIdx + 1]);
          setSelectedAddressText(parts.slice(currentIdx + 2).join(', ').trim());
        } else if (remainingPartsCount === 4) {
          setApartmentName(parts[currentIdx]);
          setSelectedAddressText(parts.slice(currentIdx + 1).join(', ').trim());
        } else {
          setSelectedAddressText(parts.slice(currentIdx).join(', ').trim());
        }
      } else {
        setSelectedAddressText(addrText);
      }
    }
    
    if (site.location && site.location.coordinates) {
      setMarkerCoordinate({
        longitude: site.location.coordinates[0],
        latitude: site.location.coordinates[1],
      });
    }

    setStep(3);
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.illustration}>
        <MaterialCommunityIcons name="map-marker-radius" size={60} color="#FFD700" />
        <Text style={[styles.title, { fontSize: 20 }]}>Where shall we deliver?</Text>
        <Text style={[styles.subtitle, { fontSize: 12 }]}>This helps us deliver your order quick.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.yellowBtn]} onPress={() => { resetForm(); setStep(2); }}>
          <Text style={styles.btnText}>I am not at the delivery location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.blackBtn]} onPress={handleUseCurrentLocation} disabled={isLocating}>
          {isLocating ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: '#fff' }]}>I am at the delivery location</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.savedAddressesHeader}>
        <Text style={styles.savedAddressesTitle}>YOUR SAVED ADDRESSES</Text>
        <TouchableOpacity onPress={() => { resetForm(); setStep(3); }}>
          <Text style={styles.addNewText}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.savedList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        {user?.jobsites?.map((site: Jobsite, idx: number) => {
          const address = site.addressText || site.address || '';
          const name = site.name || 'Saved Address';
          const phone = site.contactPhone || site.contactNumber || '';
          const type = site.addressType || site.type || 'Home';

          let lat = 0, lng = 0;
          if (site.location && site.location.coordinates) {
            lng = site.location.coordinates[0];
            lat = site.location.coordinates[1];
          } else if (site.coordinates) {
            lat = site.coordinates.latitude || 0;
            lng = site.coordinates.longitude || 0;
          }

          return (
            <View key={idx} style={styles.savedAddrCard}>
              <TouchableOpacity
                style={styles.addrCardMain}
                onPress={async () => {
                  const isServ = await checkServiceability(lat, lng);
                  if (!isServ) {
                    Toast.show({ type: 'error', text1: 'Not Serviceable', text2: "We don't deliver to this area yet." });
                    return;
                  }
                  onSelectAddress(address, { latitude: lat, longitude: lng }, {
                    pincode: site.pincode,
                    city: site.city,
                    name: site.name,
                    contactPhone: site.contactPhone,
                    jobsite: site,
                    isManual: true
                  });
                  onClose();
                }}
              >
                <View style={styles.addrIconBox}>
                  <Ionicons name={type === 'Home' ? "home-outline" : "business-outline"} size={20} color="#64748B" />
                </View>
                <View style={styles.addrInfo}>
                  <Text style={styles.addrName}>{name}</Text>
                  <Text style={styles.addrText} numberOfLines={2}>{address}</Text>
                  {phone ? <Text style={styles.addrPhone}>📞 {phone}</Text> : null}
                </View>
              </TouchableOpacity>
              
              <View style={styles.addrActions}>
                <TouchableOpacity 
                  onPress={() => handleEdit(site)}
                  style={styles.addrActionBtn}
                >
                  <Ionicons name="create-outline" size={20} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
                      { text: 'Cancel' },
                      { text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                          const updatedJobsites = user?.jobsites?.filter((item: any) => item._id !== site._id);
                          const { data } = await api.put('/api/auth/profile', { jobsites: updatedJobsites });
                          updateUser(data.user || data);
                          Toast.show({ type: 'success', text1: 'Address Deleted' });
                        } catch (err) {
                          Toast.show({ type: 'error', text1: 'Delete Failed' });
                        }
                      }}
                    ]);
                  }}
                  style={styles.addrActionBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        {(!user?.jobsites || user.jobsites.length === 0) && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No saved addresses yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for area, street name..."
          value={searchTerm}
          onChangeText={handleSearchChange}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
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

      <TouchableOpacity style={styles.currentLocRow} onPress={handleUseCurrentLocation}>
        <Ionicons name="navigate-outline" size={20} color="#000" />
        <Text style={styles.currentLocText}>Use current location</Text>
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
          onPress={(e) => {
            const coords = e.nativeEvent.coordinate;
            setMarkerCoordinate(coords);
            reverseGeocode(coords.latitude, coords.longitude);
          }}
        >
          <Marker draggable coordinate={markerCoordinate} onDragEnd={(e) => {
            const coords = e.nativeEvent.coordinate;
            setMarkerCoordinate(coords);
            reverseGeocode(coords.latitude, coords.longitude);
          }} />
          {activeGeofences.map((gf, idx) => {
            if (gf.type !== 'Polygon' || !gf.coordinates) return null;

            // Transform coordinates to [{latitude, longitude}, ...] format
            // Handles GeoJSON [[[lng, lat], ...]] or [[{lat, lng}, ...]]
            let coords = gf.coordinates;

            // If it's a nested array (GeoJSON style), take the first ring
            if (Array.isArray(coords) && Array.isArray(coords[0])) {
              coords = coords[0];
            }

            // Convert [lng, lat] arrays to {latitude, longitude} objects if necessary
            const formattedCoords = Array.isArray(coords) ? coords.map((p: any) => {
              if (Array.isArray(p) && p.length >= 2) {
                return { latitude: p[1], longitude: p[0] };
              }
              if (p && typeof p === 'object' && 'latitude' in p && 'longitude' in p) {
                return p;
              }
              return null;
            }).filter((p): p is { latitude: number; longitude: number } => p !== null) : [];

            if (formattedCoords.length < 3) return null;

            return (
              <Polygon
                key={idx}
                coordinates={formattedCoords}
                fillColor="rgba(34, 197, 94, 0.1)"
                strokeColor="rgba(34, 197, 94, 0.3)"
                strokeWidth={1}
              />
            );
          })}
        </MapView>
        <View style={styles.mapOverlayHint}>
          <Ionicons name="location" size={14} color="#EF4444" />
          <Text style={styles.mapOverlayHintText}>Move map to adjust pin</Text>
        </View>
      </View>

      <View style={styles.addressPreview}>
        <Ionicons name="location" size={24} color="#EF4444" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.previewLabel}>SELECTING LOCATION</Text>
          <Text style={styles.previewText} numberOfLines={2}>{selectedAddressText}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.confirmBtn,
          (!isServiceable || selectedAddressText === 'Detecting location...' || selectedAddressText === 'Fetching address...') && { opacity: 0.5 }
        ]}
        onPress={() => isServiceable && setStep(3)}
        disabled={!isServiceable || selectedAddressText === 'Detecting location...' || selectedAddressText === 'Fetching address...'}
      >
        <Text style={styles.confirmBtnText}>Confirm Location</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <ScrollView
      style={styles.formStep}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 40) }}
    >
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for area, street name..."
          value={searchTerm}
          onChangeText={handleSearchChange}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      </View>

      {suggestions.length > 0 && (
        <View style={[styles.suggestionsList, { top: 60, left: 0, right: 0 }]}>
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

      <View style={styles.selectedBaseAddr}>
        <Ionicons name="location" size={20} color="#EF4444" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.previewLabel}>SELECTED LOCATION</Text>
          <Text style={styles.previewText}>{selectedAddressText}</Text>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Who are you ordering for?</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, orderingFor === 'Yourself' && styles.toggleBtnActive]}
            onPress={() => setOrderingFor('Yourself')}
          >
            <Text style={[styles.toggleBtnText, orderingFor === 'Yourself' && styles.toggleBtnTextActive]}>Yourself</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, orderingFor === 'Someone else' && styles.toggleBtnActive]}
            onPress={() => setOrderingFor('Someone else')}
          >
            <Text style={[styles.toggleBtnText, orderingFor === 'Someone else' && styles.toggleBtnTextActive]}>Someone else</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Address Nickname</Text>
        <View style={styles.chipContainer}>
          {['Home', 'Office', 'Site', 'Other'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, addrType === type && styles.chipActive]}
              onPress={() => setAddrType(type as any)}
            >
              <Text style={[styles.chipText, addrType === type && styles.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGrid}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={[styles.label, errors.houseNumber && styles.labelError]}>House/ Unit Number *</Text>
          <TextInput style={[styles.input, errors.houseNumber && styles.inputError]} value={houseNumber} onChangeText={(text) => { setHouseNumber(text); if (errors.houseNumber) setErrors(prev => ({ ...prev, houseNumber: '' })); }} placeholder="e.g. 402" />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Floor</Text>
          <TextInput style={styles.input} value={floor} onChangeText={setFloor} placeholder="e.g. 4th" />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, errors.apartmentName && styles.labelError]}>Apartment/ Building Name *</Text>
        <TextInput style={[styles.input, errors.apartmentName && styles.inputError]} value={apartmentName} onChangeText={(text) => { setApartmentName(text); if (errors.apartmentName) setErrors(prev => ({ ...prev, apartmentName: '' })); }} placeholder="e.g. DLF Heights" />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Tower/ Block</Text>
        <TextInput style={styles.input} value={tower} onChangeText={setTower} placeholder="e.g. Block B" />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, errors.landmark && styles.labelError]}>Nearby Landmark *</Text>
        <TextInput style={[styles.input, errors.landmark && styles.inputError]} value={landmark} onChangeText={(text) => { setLandmark(text); if (errors.landmark) setErrors(prev => ({ ...prev, landmark: '' })); }} placeholder="e.g. Near Petrol Pump" />
      </View>

      <View style={styles.formGrid}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={[styles.label, errors.pincode && styles.labelError]}>PIN Code *</Text>
          <TextInput 
            style={[styles.input, errors.pincode && styles.inputError]} 
            value={pincode} 
            onChangeText={(text) => {
              const cleanText = text.replace(/\D/g, '').slice(0, 6);
              setPincode(cleanText);
              if (errors.pincode) setErrors(prev => ({ ...prev, pincode: '' }));
            }}
            keyboardType="number-pad"
            placeholder="e.g. 122104" 
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. Mohali" />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, errors.recipientName && styles.labelError]}>Recipient's name *</Text>
        <TextInput style={[styles.input, errors.recipientName && styles.inputError]} value={recipientName} onChangeText={(text) => { setRecipientName(text); if (errors.recipientName) setErrors(prev => ({ ...prev, recipientName: '' })); }} placeholder="e.g. Rahul Arora" />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, errors.recipientPhone && styles.labelError]}>Recipient's mobile number *</Text>
        <TextInput style={[styles.input, errors.recipientPhone && styles.inputError]} value={recipientPhone} onChangeText={(text) => { setRecipientPhone(text); if (errors.recipientPhone) setErrors(prev => ({ ...prev, recipientPhone: '' })); }} placeholder="9876543210" keyboardType="phone-pad" maxLength={10} />
      </View>

      <TouchableOpacity
        style={[
          styles.saveBtn,
          (loading || !isServiceable) && { opacity: 0.7 }
        ]}
        onPress={handleSaveAddress}
        disabled={loading || !isServiceable}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.saveBtnText}>
            {editingAddress ? 'Update Address' : 'Add complete address'}
          </Text>
        )}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { height: step === 1 ? height * 0.75 : height * 0.85 }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {step > 1 && (
                <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
              )}
              <Text style={styles.modalTitle}>
                {step === 3 ? (editingAddress ? 'Edit address details' : 'Add more address details') : 'Select delivery location'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            {step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}
            <Toast position="top" topOffset={insets.top + 10} />
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: height * 0.85, paddingTop: 20, elevation: 50, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#000' },
  backBtn: { marginRight: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  stepContainer: { flex: 1, padding: 20 },
  illustration: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  title: { fontSize: 24, fontWeight: '900', color: '#000', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  actions: { gap: 8, marginBottom: 20 },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  yellowBtn: { backgroundColor: '#FFEA00' },
  blackBtn: { backgroundColor: '#000' },
  btnText: { fontSize: 15, fontWeight: '800', color: '#000' },
  savedAddressesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  savedAddressesTitle: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  addNewText: { fontSize: 13, fontWeight: '800', color: '#000' },
  savedList: { flex: 1 },
  savedAddrCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  addrCardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  addrIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addrInfo: { flex: 1 },
  addrName: { fontSize: 15, fontWeight: '800', color: '#000', marginBottom: 2 },
  addrText: { fontSize: 12, color: '#64748B', lineHeight: 16 },
  addrPhone: { fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: '600' },
  addrActions: { flexDirection: 'row', paddingRight: 8 },
  addrActionBtn: { padding: 8 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateText: { color: '#94A3B8', fontSize: 14 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, height: 50, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#000' },
  suggestionsList: { position: 'absolute', top: 70, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 12, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, zIndex: 1000, paddingVertical: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  suggestionTextContent: { flex: 1, marginLeft: 12 },
  suggestionMainText: { fontSize: 14, color: '#1E293B', fontWeight: '700' },
  suggestionSubText: { fontSize: 12, color: '#64748B' },
  currentLocRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  currentLocText: { marginLeft: 10, fontSize: 15, fontWeight: '700' },
  addressPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 15 },
  previewLabel: { fontSize: 10, fontWeight: '900', color: '#64748B' },
  previewText: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  confirmBtn: { backgroundColor: '#000', padding: 18, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: '#FFEA00', fontSize: 16, fontWeight: '900' },
  formStep: { flex: 1, padding: 20 },
  selectedBaseAddr: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 15, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 20 },
  changeText: { fontSize: 13, fontWeight: '800', color: '#6366F1' },
  formGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  input: { width: '100%', height: 50, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 15, fontSize: 15, color: '#000' },
  readOnlyInput: { backgroundColor: '#F8FAFC', color: '#64748B' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  labelError: { color: '#EF4444' },
  toggleContainer: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center' },
  toggleBtnActive: { borderColor: '#000', backgroundColor: '#F8FAFC' },
  toggleBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  toggleBtnTextActive: { color: '#000' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#FFEA00', borderColor: '#FFEA00' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: '#000' },
  formGrid: { flexDirection: 'row' },
  saveBtn: { backgroundColor: '#FFEA00', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { fontSize: 16, fontWeight: '900', color: '#000' },
  mapContainer: { height: 250, borderRadius: 15, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  map: { width: '100%', height: '100%' },
  mapOverlayHint: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  mapOverlayHintText: { fontSize: 10, fontWeight: '800', color: '#1E293B', marginLeft: 4 },
});
