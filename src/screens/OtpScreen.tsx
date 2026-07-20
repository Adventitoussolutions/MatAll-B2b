import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

export default function OtpScreen({ route }: any) {
  const navigation: any = useNavigation();
  const { phoneNumber } = route.params || {};
  const phoneString = Array.isArray(phoneNumber) ? phoneNumber[0] : (phoneNumber || 'XXXXXXXX7701');
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendOtpTimer, setResendOtpTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const inputs = useRef<any>([]);

  useEffect(() => {
    if (resendOtpTimer === 0) return;
    const timer = setInterval(() => {
      setResendOtpTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendOtpTimer]);

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      await api.post('/api/b2b/auth/login', { phoneNumber });
      setResendOtpTimer(30);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (fullOtp: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/b2b/auth/verify', {
        phoneNumber,
        otp: fullOtp
      });
      
      const { token, user } = response.data;
      if (token) {
        await SecureStore.setItemAsync('token', token);
      }
      
      const step = user?.b2bContractor?.onboardingStep || 0;
      if (step === 0) {
        navigation.replace('VerifyAccount');
      } else if (step === 1) {
        navigation.replace('CompleteProfile');
      } else {
        navigation.replace('MainTabs', { screen: 'Home' });
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.response?.data?.message || err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fullOtp = otp.join('');
    if (fullOtp.length === 6) {
      handleVerify(fullOtp);
    }
  }, [otp]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const pastedOtp = value.split('').slice(0, 6);
      const newOtp = ['', '', '', '', '', ''];
      pastedOtp.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      const nextFocus = Math.min(pastedOtp.length - 1, 5);
      inputs.current[nextFocus]?.focus();
      return;
    }

    setOtp(prev => {
      const newOtp = [...prev];
      newOtp[index] = value;
      return newOtp;
    });

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.tagline}>
          India’s fastest home repair & renovation material delivery app
        </Text>

        <Text style={styles.otpTitle}>OTP</Text>

        <Text style={styles.otpSubtitle}>
          Please input the 6 digit code has been sent to your mobile {phoneString.slice(0, -4).replace(/./g, 'X') + phoneString.slice(-4)}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => { inputs.current[index] = el; }}
              style={styles.otpInput}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? 6 : 1}
              textAlign="center"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              autoFocus={index === 0}
              selectionColor="#000"
              cursorColor="#000"
              placeholderTextColor="#999"
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleResendOtp}
          disabled={resendOtpTimer > 0 || isLoading}
          style={styles.resendButton}
        >
          <Text style={styles.resendText}>
            Did not get code? <Text style={[
              styles.resendLink,
              (resendOtpTimer > 0 || isLoading) && styles.disabledResendLink
            ]}>
              {resendOtpTimer > 0 ? `Resend (${resendOtpTimer}s)` : 'Resend now'}
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.guestButton}
          onPress={() => navigation.replace('MainTabs', { screen: 'Profile' })}
        >
          <Text style={styles.guestText}>Continue as guest</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you are agreeing to app's
          </Text>
          <Text style={styles.footerLinks}>
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
    paddingTop: 60,
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
    transform: [{ scale: 2 }]
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 40,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  otpSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    fontSize: 20,
    fontWeight: '700',
    backgroundColor: '#fff',
    color: '#000',
    padding: 0,
    textAlignVertical: 'center',
  },
  resendButton: {
    marginBottom: 40,
  },
  resendText: {
    fontSize: 14,
    color: '#000',
  },
  resendLink: {
    color: '#000',
    fontWeight: '700',
  },
  disabledResendLink: {
    color: '#999',
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
    color: '#666',
    marginBottom: 4,
  },
  footerLinks: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    textDecorationLine: 'underline',
  }
});
