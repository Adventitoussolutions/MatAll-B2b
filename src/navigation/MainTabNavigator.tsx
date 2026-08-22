import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import ShopScreen from '../screens/ShopScreen';
import CartScreen from '../screens/CartScreen';
import ViewProfileScreen from '../screens/ViewProfileScreen';

import { useCart } from '../context/CartContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function OrdersStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="OrdersMain" component={OrdersScreen} />
            <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
        </Stack.Navigator>
    );
}

export default function MainTabNavigator() {
    const insets = useSafeAreaInsets();
    const { cart } = useCart();
    const cartItemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#000',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: '#F3F4F6',
                    height: 60 + insets.bottom,
                    paddingBottom: 8 + insets.bottom,
                    paddingTop: 8,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any = 'home';

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Orders') {
                        iconName = focused ? 'reader' : 'reader-outline';
                    } else if (route.name === 'Shop') {
                        iconName = focused ? 'storefront' : 'storefront-outline';
                    } else if (route.name === 'Cart') {
                        iconName = focused ? 'cart' : 'cart-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{ tabBarLabel: 'Home' }} 
            />
            <Tab.Screen 
                name="Orders" 
                component={OrdersStack} 
                options={{ tabBarLabel: 'Orders' }} 
            />
            <Tab.Screen 
                name="Shop" 
                component={ShopScreen} 
                options={{ tabBarLabel: 'Shop' }} 
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('Shop', {
                            screen: 'ShopPage'
                        });
                    },
                })}
            />
            <Tab.Screen 
                name="Cart" 
                component={CartScreen} 
                options={{ 
                    tabBarLabel: 'Cart',
                    tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
                    tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 10 }
                }} 
            />
            <Tab.Screen 
                name="Profile" 
                component={ViewProfileScreen} 
                options={{ tabBarLabel: 'Profile' }} 
            />
        </Tab.Navigator>
    );
}
