import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface GuestScreenProps {
  title?: string;
  description?: string;
  icon?: string;
}

const GuestScreen: React.FC<GuestScreenProps> = ({ 
  title = "Unlock Full Features", 
  description = "Log in to view your orders, save favorite materials, and manage your construction projects.",
  icon = "lock-closed-outline"
}) => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon as any} size={64} color="#000" />
          </View>
          <View style={styles.smallCircle} />
          <View style={styles.mediumCircle} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <TouchableOpacity 
          style={styles.loginBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginBtnText}>Login / Sign Up</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.exploreBtn}
          onPress={() => navigation.navigate('HOME')}
        >
          <Text style={styles.exploreBtnText}>Continue Browsing</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  smallCircle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFE100',
    top: 10,
    right: -10,
    zIndex: 3,
  },
  mediumCircle: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    bottom: -10,
    left: -20,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  loginBtn: {
    width: '100%',
    backgroundColor: '#000',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  exploreBtn: {
    paddingVertical: 12,
  },
  exploreBtnText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700',
  }
});

export default GuestScreen;
