import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import * as SplashScreen from 'expo-splash-screen';

export default function App() {
  useEffect(() => {
    // Hide the splash screen after the app is ready
    // Ideally this happens after AuthContext is done loading, but for now we just hide it on mount
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
