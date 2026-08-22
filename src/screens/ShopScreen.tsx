import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import ShopPageScreen from './ShopPageScreen';
import DetailsScreen from './DetailsScreen';
import AddressScreen from './AddressScreen';
import AddAddressScreen from './AddAddressScreen';
import FavoritesScreen from './FavoritesScreen';
import NoProductFoundScreen from './NoProductFoundScreen';
import WithdrawRequestScreen from './WithdrawRequestScreen';

const Stack = createNativeStackNavigator();

export default function ShopScreen({ route }: any) {
  return (
    <Stack.Navigator
      initialRouteName="ShopPage"
      screenOptions={{ headerShown: false, animation: 'none' }}
    >
      <Stack.Screen name="ShopPage" component={ShopPageScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} initialParams={{ hasTabs: true }} />
      <Stack.Screen name="Address" component={AddressScreen} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="NoProductFound" component={NoProductFoundScreen} />
      <Stack.Screen name="WithdrawRequest" component={WithdrawRequestScreen} />
    </Stack.Navigator>
  );
}
