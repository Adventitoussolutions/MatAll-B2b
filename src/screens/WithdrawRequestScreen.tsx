import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

export default function WithdrawRequestScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.black} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Withdraw Balance</Text>
          <Text style={styles.headerSub}>AFFILIATE EARNINGS</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Withdrawals Coming Soon Announcement Card */}
        <View style={styles.comingSoonCard}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="rocket-launch" size={48} color="#CA8A04" />
          </View>
          <Text style={styles.comingSoonTitle}>Withdrawals Coming Soon</Text>
          <Text style={styles.comingSoonDesc}>
            Bank linking and wallet balance cash withdrawals are coming soon. In the meantime, you can redeem your points as checkout discounts on your orders!
          </Text>
          
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Back to Wallet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: Colors.black },
  headerSub: { fontSize: 8, color: Colors.text.muted, fontWeight: '800', letterSpacing: 0.5 },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  comingSoonCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.medium,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FEF9C3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonDesc: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontWeight: '600',
  },
  backBtn: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    elevation: 2,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.black,
  },
});
