import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { Alert } from 'react-native';
import { B2B_POLICIES_URL } from '../config';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation: any = useNavigation();

  const handleContinue = async () => {
    if (phoneNumber.length === 10) {
      setIsLoading(true);
      try {
        await api.post('/api/b2b/auth/login', { phoneNumber });
        navigation.navigate('Otp', { phoneNumber });
      } catch (err: any) {
        Alert.alert('Login Failed', err.response?.data?.message || err.message || 'Failed to send OTP');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOpenPolicy = () => {
    Linking.openURL(B2B_POLICIES_URL);
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/logo.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.taglineSection}>
          <Text style={styles.mainTagline}>
            India’s Fastest Home Repair & Renovation Material Delivery app
          </Text>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.phoneInputContainer}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter mobile number"
              keyboardType="phone-pad"
              placeholderTextColor="#999"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          <TouchableOpacity
            onPress={handleContinue}
            disabled={isLoading || phoneNumber.length !== 10}
            style={[
              styles.continueBtn,
              (phoneNumber.length === 10 && !isLoading) ? { backgroundColor: '#FFD700' } : null
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={(phoneNumber.length === 10 && !isLoading) ? { color: '#000', fontWeight: 'bold' } : { color: '#999' }}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>


        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you are agreeing to app's
          </Text>
          <Text
            style={styles.footerLinks}
            onPress={handleOpenPolicy}
          >
            Terms of Service & Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: "center"
  },
  logoSection: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    alignSelf: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    transform: [{ scale: 2 }],
  },
  taglineSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTagline: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  inputSection: {
    width: '100%',
    marginBottom: 20,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F3',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 56,
    marginBottom: 16,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  continueBtn: {
    height: 56,
    backgroundColor: '#E0E1E6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  guestText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#60646C',
    marginBottom: 4,
  },
  footerLinks: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    textDecorationLine: 'underline',
  }
});
