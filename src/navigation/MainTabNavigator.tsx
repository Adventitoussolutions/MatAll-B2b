import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import PartnerScreen from '../screens/PartnerScreen';
import ViewProfileScreen from '../screens/ViewProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    const insets = useSafeAreaInsets();

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
                    } else if (route.name === 'Partner') {
                        iconName = focused ? 'briefcase' : 'briefcase-outline';
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
                component={OrdersScreen} 
                options={{ tabBarLabel: 'Orders' }} 
            />
            <Tab.Screen 
                name="Partner" 
                component={PartnerScreen} 
                options={{ tabBarLabel: 'Partner' }} 
            />
            <Tab.Screen 
                name="Profile" 
                component={ViewProfileScreen} 
                options={{ tabBarLabel: 'Profile' }} 
            />
        </Tab.Navigator>
    );
}
