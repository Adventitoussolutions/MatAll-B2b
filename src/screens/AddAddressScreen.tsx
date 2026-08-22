import React, { useState, useEffect } from 'react';
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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Toast from 'react-native-toast-message';

import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

interface AddAddressScreenProps {
  navigation: any;
  route: any;
}

export default function AddAddressScreen({ navigation, route }: AddAddressScreenProps) {
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [newAddrName, setNewAddrName] = useState('');
  const [newAddrType, setNewAddrType] = useState<'Home' | 'Office' | 'Site' | 'Other'>('Home');
  const [houseNumber, setHouseNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [tower, setTower] = useState('');
  const [landmark, setLandmark] = useState('');
  const [apartmentName, setApartmentName] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');
  const [addressText, setAddressText] = useState('');
  const [orderingFor, setOrderingFor] = useState<'Yourself' | 'Someone else'>('Yourself');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user, updateUser } = useAuth();
  const editAddress = route.params?.editAddress;

  useEffect(() => {
    if (editAddress) {
      setNewAddrName(editAddress.name || '');
      setNewAddrType(editAddress.addressType || 'Home');
      setNewAddrPhone(editAddress.contactPhone || '');
      setPincode(editAddress.pincode || '');
      setCity(editAddress.city || '');
      setHouseNumber(editAddress.houseNumber || '');
      setFloor(editAddress.floor || '');
      setTower(editAddress.tower || '');
      setApartmentName(editAddress.apartmentName || '');
      setLandmark(editAddress.landmark || '');
      
      // Parse base address text
      let baseAddr = editAddress.addressText || '';
      if (editAddress.landmark) baseAddr = baseAddr.replace(` (Near ${editAddress.landmark})`, '');
      if (editAddress.apartmentName) baseAddr = baseAddr.replace(`${editAddress.apartmentName}, `, '');
      if (editAddress.tower) baseAddr = baseAddr.replace(`${editAddress.tower}, `, '');
      if (editAddress.floor) baseAddr = baseAddr.replace(`Floor ${editAddress.floor}, `, '');
      if (editAddress.houseNumber) baseAddr = baseAddr.replace(`${editAddress.houseNumber}, `, '');
      setAddressText(baseAddr.trim());

      setOrderingFor(editAddress.name === user?.fullName ? 'Yourself' : 'Someone else');
    } else if (user) {
      setNewAddrName(user.fullName || '');
      setNewAddrPhone(user.phoneNumber || '');
    }
  }, [user, editAddress]);

  const handleSaveAddress = async () => {
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!houseNumber) newErrors.houseNumber = 'Required';
    if (!apartmentName) newErrors.apartmentName = 'Required';
    if (!addressText) newErrors.addressText = 'Required';
    if (!landmark) newErrors.landmark = 'Required';
    if (!pincode) newErrors.pincode = 'Required';
    else if (!/^\d{6}$/.test(pincode)) newErrors.pincode = 'Invalid PIN (6 digits)';

    if (!city) newErrors.city = 'Required';
    if (!newAddrName) newErrors.newAddrName = 'Required';
    if (!newAddrPhone) newErrors.newAddrPhone = 'Required';
    else if (!/^\d{10}$/.test(newAddrPhone)) newErrors.newAddrPhone = 'Invalid Phone (10 digits)';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please correct the highlighted fields.'
      });
      return;
    }

    setLoading(true);
    try {
      const formattedAddress = `${houseNumber}, ${floor ? 'Floor ' + floor + ', ' : ''}${tower ? tower + ', ' : ''}${apartmentName ? apartmentName + ', ' : ''}${addressText}${landmark ? ' (Near ' + landmark + ')' : ''}`;

      const newJobsite = {
        name: newAddrName,
        addressType: newAddrType,
        addressText: formattedAddress,
        contactPhone: newAddrPhone,
        pincode: pincode,
        city: city,
        houseNumber: houseNumber,
        floor: floor,
        tower: tower,
        apartmentName: apartmentName,
        landmark: landmark,
        location: {
          type: 'Point',
          coordinates: [77.3910, 28.5355] // Mock coordinates
        }
      };

      if (!user) {
        navigation.navigate('Login');
        return;
      }

      let updatedJobsites;
      if (editAddress) {
        // Update existing jobsite
        updatedJobsites = (user.jobsites || []).map((item: any) =>
          item._id === editAddress._id ? { ...newJobsite, _id: editAddress._id } : item
        );
      } else {
        // Add new jobsite
        updatedJobsites = [...(user.jobsites || []), newJobsite];
      }

      const { data } = await api.put('/api/auth/profile', { jobsites: updatedJobsites }).catch(err => {
        return { data: { user: { ...user, jobsites: updatedJobsites } } };
      });

      const updatedUser = data.user || data;
      if (updatedUser) {
        await updateUser(updatedUser);
      }

      Alert.alert('Success', editAddress ? 'Address updated successfully!' : 'Address added successfully!');
      navigation.goBack();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: err.response?.data?.message || 'Failed to save address'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editAddress ? 'Edit Address' : 'Add Address'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
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
                  style={[styles.chip, newAddrType === type && styles.chipActive]}
                  onPress={() => setNewAddrType(type as any)}
                >
                  <Text style={[styles.chipText, newAddrType === type && styles.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGrid}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={[styles.label, errors.houseNumber && styles.labelError]}>House/ Unit Number *</Text>
              <TextInput
                style={[styles.input, errors.houseNumber && styles.inputError]}
                value={houseNumber}
                onChangeText={setHouseNumber}
                placeholder="e.g. 402"
                placeholderTextColor={Colors.text.muted}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Floor</Text>
              <TextInput
                style={styles.input}
                value={floor}
                onChangeText={setFloor}
                placeholder="e.g. 4th"
                placeholderTextColor={Colors.text.muted}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, errors.apartmentName && styles.labelError]}>Apartment/ Building Name *</Text>
            <TextInput
              style={[styles.input, errors.apartmentName && styles.inputError]}
              value={apartmentName}
              onChangeText={setApartmentName}
              placeholder="e.g. DLF Heights"
              placeholderTextColor={Colors.text.muted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tower/ Block</Text>
            <TextInput
              style={styles.input}
              value={tower}
              onChangeText={setTower}
              placeholder="e.g. Block B"
              placeholderTextColor={Colors.text.muted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, errors.addressText && styles.labelError]}>Area / Sector / Street Address *</Text>
            <TextInput
              style={[styles.input, errors.addressText && styles.inputError]}
              value={addressText}
              onChangeText={setAddressText}
              placeholder="Enter area address"
              placeholderTextColor={Colors.text.muted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, errors.landmark && styles.labelError]}>Nearby Landmark *</Text>
            <TextInput
              style={[styles.input, errors.landmark && styles.inputError]}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="e.g. Near Petrol Pump"
              placeholderTextColor={Colors.text.muted}
            />
          </View>

          <View style={styles.formGrid}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={[styles.label, errors.pincode && styles.labelError]}>PIN Code *</Text>
              <TextInput
                style={[styles.input, errors.pincode && styles.inputError]}
                value={pincode}
                onChangeText={setPincode}
                keyboardType="numeric"
                maxLength={6}
                placeholder="e.g. 110001"
                placeholderTextColor={Colors.text.muted}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.label, errors.city && styles.labelError]}>City *</Text>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. New Delhi"
                placeholderTextColor={Colors.text.muted}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, errors.newAddrName && styles.labelError]}>Recipient's name *</Text>
            <TextInput
              style={[styles.input, errors.newAddrName && styles.inputError]}
              value={newAddrName}
              onChangeText={setNewAddrName}
              placeholder="e.g. Rahul Arora"
              placeholderTextColor={Colors.text.muted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, errors.newAddrPhone && styles.labelError]}>Recipient's mobile number *</Text>
            <TextInput
              style={[styles.input, errors.newAddrPhone && styles.inputError]}
              value={newAddrPhone}
              onChangeText={setNewAddrPhone}
              placeholder="9876543210"
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor={Colors.text.muted}
            />
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveAddress}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>{editAddress ? 'Update Address' : 'Save Address'}</Text>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.black },
  formContainer: { flex: 1, padding: 20 },
  formGroup: { marginBottom: 16 },
  formGrid: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#000',
  },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  labelError: { color: '#EF4444' },
  toggleContainer: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 12, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  toggleBtnTextActive: { color: '#000', fontWeight: '900' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: '#000', fontWeight: '900' },
  saveBtn: { backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '900', color: Colors.primary },
});
