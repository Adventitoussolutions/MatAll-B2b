import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Hi, Ramesh</Text>
            <Text style={styles.subtitleText}>
              <Text style={{ color: '#EAB308' }}>☐</Text> Electrician <Text style={{ color: '#EAB308' }}>· Verified</Text>
            </Text>
          </View>
          <View style={styles.profileCircle} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Orders this month</Text>
            <Text style={styles.statValue}>43</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Wallet balance</Text>
            <Text style={styles.statValue}>₹1,000</Text>
          </View>
        </View>

        {/* Community Partner Banner */}
        <View style={styles.partnerBanner}>
          <Text style={styles.bannerTitle}>Become a community partner</Text>
          <Text style={styles.bannerSubtitle}>Earn 1% on every referral, for life</Text>
          <TouchableOpacity 
            style={styles.bannerButton}
            onPress={() => navigation.navigate('AffiliateOnboarding')}
          >
            <Text style={styles.bannerButtonText}>Get started →</Text>
          </TouchableOpacity>
        </View>

        {/* Menu List */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>My orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Verification status</Text>
            <Text style={styles.verifiedText}>Verified</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Saved addresses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <Text style={styles.menuText}>Support</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // The top safe area seems black in the design
  },
  scrollContent: {
    backgroundColor: '#fff',
    flexGrow: 1,
    borderTopLeftRadius: 20, // To match if there's a slight curve, otherwise remove
    borderTopRightRadius: 20,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: '#000',
  },
  greetingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitleText: {
    color: '#EAB308',
    fontSize: 14,
    fontWeight: '500',
  },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
  },
  statValue: {
    color: '#1F2937',
    fontSize: 24,
    fontWeight: '400',
  },
  partnerBanner: {
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 16,
  },
  bannerButton: {
    backgroundColor: '#EAB308',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bannerButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  menuContainer: {
    marginTop: 30,
    paddingHorizontal: 24,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuText: {
    fontSize: 16,
    color: '#1F2937',
  },
  verifiedText: {
    fontSize: 14,
    color: '#10B981',
  }
});
