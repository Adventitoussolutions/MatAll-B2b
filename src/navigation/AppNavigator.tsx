import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import VerifyAccountScreen from '../screens/VerifyAccountScreen';
import MainTabNavigator from './MainTabNavigator';
import AffiliateOnboardingScreen from '../screens/AffiliateOnboardingScreen';
import LocationSelectionScreen from '../screens/LocationSelectionScreen';
import AffiliateWalletScreen from '../screens/AffiliateWalletScreen';
import CompleteProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="VerifyAccount" component={VerifyAccountScreen} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="AffiliateOnboarding" component={AffiliateOnboardingScreen} />
      <Stack.Screen name="LocationSelection" component={LocationSelectionScreen} />
      <Stack.Screen name="AffiliateWallet" component={AffiliateWalletScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </Stack.Navigator>
  );
}
