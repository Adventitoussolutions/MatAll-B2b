import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Hardcoded colors for now to match the B2B app design
const Colors = {
    primary: '#EAB308',
    black: '#000',
    white: '#fff',
    text: { muted: '#9CA3AF', secondary: '#4B5563' },
    border: { light: '#F3F4F6', medium: '#E5E7EB' },
    background: { secondary: '#FAFAFA' },
    status: { info: '#3B82F6' }
};

export default function AffiliateOnboardingScreen() {
  const navigation = useNavigation<any>();
  const { fetchProfile } = useAuth();
  
  // Steps: 'FORM_STEP' | 'SUBMITTING'
  const [step, setStep] = useState<'FORM_STEP' | 'SUBMITTING'>('FORM_STEP');
  
  // Onboarding Form States
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [home, setHome] = useState('');
  const [dob, setDob] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('');

  const handleRegisterAffiliate = async () => {
    if (!name || !city || !home || !dob) {
      Alert.alert('Missing Fields', 'Please fill in all mandatory fields (*).');
      return;
    }

    setStep('SUBMITTING');
    
    try {
      await api.post('/api/affiliate/apply', {
        name,
        city,
        home,
        dob,
        anniversaryDate: anniversaryDate || undefined
      });

      await fetchProfile();

      Alert.alert('Success', 'You are now an active affiliate partner.');
      navigation.goBack(); // Or replace with 'AffiliateWallet' once that screen is built
      
    } catch (err: any) {
      Alert.alert('Onboarding Failed', err.response?.data?.message || err.message || 'Failed to register as partner.');
      setStep('FORM_STEP');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Affiliate Onboarding</Text>
          <Text style={styles.headerSubtitle}>PARTNER PORTAL</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {step === 'FORM_STEP' && (
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.infoCard}>
              <Ionicons name="ribbon" size={32} color={Colors.primary} style={{ marginBottom: 10 }} />
              <Text style={styles.infoTitle}>Become a Community Partner</Text>
              <Text style={styles.infoSub}>
                Fill in details to register as an affiliate partner and earn reward points on order references!
              </Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={Colors.text.muted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.fieldLabel}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Gurgaon"
                placeholderTextColor={Colors.text.muted}
                value={city}
                onChangeText={setCity}
              />

              <Text style={styles.fieldLabel}>Home Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter home address"
                placeholderTextColor={Colors.text.muted}
                value={home}
                onChangeText={setHome}
              />

              <Text style={styles.fieldLabel}>Date of Birth *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.text.muted}
                value={dob}
                onChangeText={setDob}
              />

              <Text style={styles.fieldLabel}>Anniversary Date (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.text.muted}
                value={anniversaryDate}
                onChangeText={setAnniversaryDate}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleRegisterAffiliate}>
                <Text style={styles.primaryBtnText}>Submit Onboarding</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {step === 'SUBMITTING' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: 24 }} />
            <Text style={styles.verifyingText}>Registering Affiliate Profile...</Text>
            <Text style={styles.verifyingSubText}>Creating your unique partner code.</Text>
          </View>
        )}
      </KeyboardAvoidingView>
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
    paddingVertical: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.black },
  headerSubtitle: { fontSize: 9, color: Colors.text.muted, fontWeight: '800', letterSpacing: 1 },
  scrollContent: { padding: 20 },
  infoCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: Colors.border.light, elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  infoTitle: { fontSize: 20, fontWeight: '900', color: Colors.black, marginBottom: 6 },
  infoSub: { fontSize: 13, color: Colors.text.muted, textAlign: 'center', lineHeight: 18 },
  formContainer: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border.light, elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: Colors.text.secondary, marginBottom: 6 },
  input: { width: '100%', height: 50, borderWidth: 1.5, borderColor: Colors.border.medium, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, color: Colors.black, fontWeight: '600', marginBottom: 16, backgroundColor: Colors.background.secondary },
  primaryBtn: { width: '100%', height: 52, backgroundColor: Colors.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 2, marginTop: 10 },
  primaryBtnText: { fontSize: 16, fontWeight: '900', color: Colors.black },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  verifyingText: { fontSize: 16, fontWeight: '800', color: Colors.black, textAlign: 'center', marginBottom: 8 },
  verifyingSubText: { fontSize: 13, color: Colors.text.muted, textAlign: 'center', lineHeight: 18 }
});
