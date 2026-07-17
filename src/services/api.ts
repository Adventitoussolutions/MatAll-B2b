import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axiosRetry from 'axios-retry';
import { Platform } from 'react-native';

/**
 * ⚠️ PRODUCTION SECURITY NOTE:
 * Always use HTTPS for production APIs to satisfy App Store (ATS) 
 * and Google Play (Cleartext Policy) requirements.
 */
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.matall.app',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure axios-retry
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Only retry on network errors or 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response ? error.response.status >= 500 : false);
  }
});

// Request interceptor to add token if available
api.interceptors.request.use(
  async (config) => {
    try {
      // Use SecureStore for the token if possible, fallback to AsyncStorage for data
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('[API Auth Error] Failed to get token', e);
    }

    if (__DEV__) {
      const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
      console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for logging
api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API Response] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (__DEV__) {
      console.log(`[API Response Error] ${error.response?.status} ${error.config?.url}`, error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
