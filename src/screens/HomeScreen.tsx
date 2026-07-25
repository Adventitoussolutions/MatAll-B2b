import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  useEffect(() => {
    console.log('[HomeScreen] Current User Affiliate Status:', user?.isAffiliate);
  }, [user]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>{user?.fullName}</Text>
          </View>
          <View>
            <TouchableOpacity 
              style={[styles.profileCircle, { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}
              onPress={() => navigation.navigate('Profile')}
            >
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Feather name="user" size={24} color={Colors.text.primary} />
              )}
            </TouchableOpacity>
            {user?.isAffiliate && (
              <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: Colors.white, borderRadius: 10, padding: 2, elevation: 2, zIndex: 10 }}>
                <MaterialCommunityIcons name="crown" size={14} color="#FFE100" />
              </View>
            )}
          </View>
        </View>

        {/* Stats Row */}
        {user?.isAffiliate && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Orders Referred</Text>
              <Text style={styles.statValue}>{user?.totalSuccessfulOrders || 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Wallet balance</Text>
              <Text style={styles.statValue}>₹{Number(user?.walletBalance || 0).toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Community Partner Banner */}
        <View style={styles.partnerBanner}>
          <Text style={styles.bannerTitle}>
            {user?.isAffiliate ? 'Community Dashboard' : 'Become a community partner'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {user?.isAffiliate ? 'Manage your referrals and wallet' : 'Earn 1% on every referral, for life'}
          </Text>
          <TouchableOpacity
            style={styles.bannerButton}
            onPress={() => navigation.navigate(user?.isAffiliate ? 'AffiliateWallet' : 'AffiliateOnboarding')}
          >
            <Text style={styles.bannerButtonText}>
              {user?.isAffiliate ? 'View Dashboard →' : 'Get started →'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Menu List */}
        {/* <View style={styles.menuContainer}>
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
        </View> */}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  greetingText: {
    color: Colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitleText: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    backgroundColor: Colors.background.secondary,
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
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerTitle: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  bannerSubtitle: {
    color: Colors.text.secondary,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  bannerButton: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  bannerButtonText: {
    color: Colors.black,
    fontWeight: '600',
    fontSize: 15,
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
