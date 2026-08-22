import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OfflineBannerProps {
  message?: string;
  onPress?: () => void;
}

import { Colors } from '../constants/Colors';

const OfflineBanner: React.FC<OfflineBannerProps> = ({ 
  message = "Oops! You caught us offline. We will be back online by 9 AM. Please visit back to place order at that time.",
  onPress 
}) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      style={styles.container}
    >
      <Ionicons name="warning-outline" size={18} color={Colors.white} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.status.error,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    flexShrink: 1,
    letterSpacing: -0.2,
  },
});

export default OfflineBanner;
