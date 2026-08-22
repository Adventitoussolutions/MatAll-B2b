import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { SettingsProvider } from './src/context/SettingsContext';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';

export default function App() {
  useEffect(() => {
    // Hide the splash screen after the app is ready
    // Ideally this happens after AuthContext is done loading, but for now we just hide it on mount
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <FavoritesProvider>
          <CartProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
            <Toast />
          </CartProvider>
        </FavoritesProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
