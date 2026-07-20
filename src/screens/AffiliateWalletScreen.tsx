import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function AffiliateWalletScreen({ navigation }: any) {
  const { user, fetchProfile } = useAuth();
  const refreshProfile = fetchProfile;
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Ledger States
  const [ledger, setLedger] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);

  useEffect(() => {
    fetchMetrics();
    fetchLedger(1);
  }, []);

  useEffect(() => {
    fetchLedger(ledgerPage);
  }, [ledgerPage]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const [res] = await Promise.all([
        api.get('/api/affiliate/dashboard'),
        refreshProfile().catch(err => {
          if (__DEV__) console.log('Error refreshing profile in wallet screen:', err);
        })
      ]);
      setMetrics(res?.data);
    } catch (err) {
      console.error('[AffiliateWalletScreen] Error fetching metrics', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async (page: number) => {
    try {
      setLoadingLedger(true);
      const { data } = await api.get(`/api/affiliate/ledger?page=${page}&limit=10`);
      setLedger(data.ledger || []);
      setLedgerTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('[AffiliateWalletScreen] Error fetching ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const refCode = metrics?.affiliateCode || user?.affiliateCode || 'MATALL';
  const branchLink = `https://matall.app/referral/${refCode}`;
  const balance = metrics?.walletBalance || 0;

  const city = metrics?.city || 'Gurgaon';
  const cityRank = metrics?.cityRank || 1;
  const totalCityAffiliates = metrics?.totalCityAffiliates || 1;
  const cityLeaderSales = metrics?.cityLeaderSales || 0;

  const globalRank = metrics?.globalRank || 1;
  const totalGlobalAffiliates = metrics?.totalGlobalAffiliates || 1;
  const globalLeaderSales = metrics?.globalLeaderSales || 0;

  const cityTopPercent = totalCityAffiliates > 0 ? ((cityRank / totalCityAffiliates) * 100).toFixed(1) : '100';
  const cityProgressWidth = totalCityAffiliates > 0 ? Math.max(5, Math.round(((totalCityAffiliates - cityRank + 1) / totalCityAffiliates) * 100)) : 100;

  const globalTopPercent = totalGlobalAffiliates > 0 ? ((globalRank / totalGlobalAffiliates) * 100).toFixed(1) : '100';
  const globalProgressWidth = totalGlobalAffiliates > 0 ? Math.max(5, Math.round(((totalGlobalAffiliates - globalRank + 1) / totalGlobalAffiliates) * 100)) : 100;

  const handleShareAffiliate = async () => {
    try {
      await Share.share({
        message: `Join MatAll using my partner code ${refCode}! Order construction and home repair supplies now: ${branchLink}`,
        url: branchLink
      });
    } catch (error: any) {
      console.error(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.black} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Community Partner Dashboard</Text>
          <Text style={styles.headerSubtitle}>WALLET & METRICS</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Main Content Scroll Engine */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topSection}>
            {/* Wallet & Balance Card */}
            <View style={styles.dashboardCard}>
              <View style={styles.heroHeader}>
                <View style={styles.walletIconBg}>
                  <MaterialCommunityIcons name="wallet-outline" size={24} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletRule}>1 pt = ₹1</Text>
                  <Text style={styles.heroLabel}>Available Balance</Text>
                </View>
                <Text style={styles.heroBalance}>{balance.toFixed(2)} pts</Text>
              </View>

              <View style={styles.miniStatsRow}>
                <View style={styles.miniStatBox}>
                  <Text style={styles.miniLabel}>Total Awarded</Text>
                  <Text style={styles.miniValue}>{parseFloat(metrics?.totalPointsAwarded || 0).toFixed(2)} pts</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.miniStatBox}>
                  <Text style={styles.miniLabel}>Total Redeemed</Text>
                  <Text style={styles.miniValue}>{parseFloat(metrics?.totalPointsRedeemed || 0).toFixed(2)} pts</Text>
                </View>
              </View>

              <View style={styles.dashboardDivider} />

              {/* Leaderboard Standings (City / Global World) */}
              <View style={styles.rankBoxesContainer}>
                <View style={styles.rankMetricBox}>
                  <Text style={styles.rankMetricLabel}>{city.toUpperCase()} CITY</Text>
                  <Text style={styles.rankValueText}>#{cityRank} <Text style={styles.rankValueTotal}>/ {totalCityAffiliates}</Text> <Text style={styles.rankPercentileHighlight}>(Top {cityTopPercent}%)</Text></Text>
                  <View style={styles.rankProgressTrack}>
                    <View style={[styles.rankProgressBar, { width: `${cityProgressWidth}%`, backgroundColor: Colors.primary }]} />
                  </View>
                  <Text style={styles.rankTopEarner}>City Leader's Sales: ₹{cityLeaderSales.toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.dashboardVerticalDivider} />

                <View style={styles.rankMetricBox}>
                  <Text style={styles.rankMetricLabel}>GLOBAL WORLD</Text>
                  <Text style={styles.rankValueText}>#{globalRank} <Text style={styles.rankValueTotal}>/ {totalGlobalAffiliates}</Text> <Text style={styles.rankPercentileHighlight}>(Top {globalTopPercent}%)</Text></Text>
                  <View style={styles.rankProgressTrack}>
                    <View style={[styles.rankProgressBar, { width: `${globalProgressWidth}%`, backgroundColor: Colors.primary }]} />
                  </View>
                  <Text style={styles.rankTopEarner}>Global Leader's Sales: ₹{globalLeaderSales.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>

            {/* PERFORMANCE SUMMARY TABLE */}
            <View style={styles.performanceSection}>
              <Text style={styles.sectionHeader}>Performance Summary</Text>

              <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.columnHeader, { flex: 1.5, textAlign: 'left' }]}>Metric</Text>
                  <Text style={styles.columnHeader}>Value</Text>
                </View>

                {/* Table Rows */}
                <View style={styles.tableRow}>
                  <Text style={styles.rowLabel}>Referred Users</Text>
                  <Text style={styles.rowValue}>{metrics?.totalReferredUsers || 0}</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={styles.rowLabel}>Total Successful Orders</Text>
                  <Text style={styles.rowValue}>{metrics?.totalSuccessfulOrders || 0}</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={styles.rowLabel}>Total Sales Value</Text>
                  <Text style={styles.rowValue}>₹{parseFloat(metrics?.totalOrderValue || 0).toFixed(2)}</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={styles.rowLabel}>Avg Order Value</Text>
                  <Text style={styles.rowValue}>₹{parseFloat(metrics?.averageOrderValue || 0).toFixed(2)}</Text>
                </View>

                <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.rowLabel}>Total Points Awarded</Text>
                  <Text style={styles.rowValue}>{parseFloat(metrics?.totalPointsAwarded || 0).toFixed(2)} pts</Text>
                </View>
              </View>
            </View>

            {/* LEDGER TRANSACTION HISTORY */}
            <View style={styles.ledgerSection}>
              <Text style={styles.sectionHeader}>Affiliate Ledger History</Text>

              {loadingLedger ? (
                <View style={styles.ledgerLoader}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.ledgerLoaderText}>Loading ledger...</Text>
                </View>
              ) : ledger.length === 0 ? (
                <View style={styles.emptyLedgerBox}>
                  <Text style={styles.emptyLedgerText}>No transactions found.</Text>
                </View>
              ) : (
                <View style={styles.ledgerContainer}>
                  {ledger.map((entry, idx) => {
                    const createdAt = new Date(entry.createdAt);
                    const dateStr = isNaN(createdAt.getTime()) ? '—' : createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                    const timeStr = isNaN(createdAt.getTime()) ? '—' : createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isCredit = entry.pointsEarned > 0;
                    const description = (entry.description || '')
                      .replace(/\s*\(Order\s+#[a-f0-9]+(?:\s+Cancelled)?\)/gi, '')
                      .replace(/\s*\(Checkout\s+on\s+Order\s+#[a-f0-9]+\)/gi, '') 
                      || (isCredit ? 'Points Earned' : 'Points Deducted');

                    return (
                      <View key={entry._id || idx} style={[styles.ledgerRow, idx === ledger.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={styles.ledgerLeft}>
                          <Text style={styles.ledgerDate}>{dateStr}</Text>
                          <Text style={styles.ledgerTime}>{timeStr}</Text>
                        </View>

                        <View style={styles.ledgerMiddle}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                            <View style={[styles.typeBadge, { backgroundColor: isCredit ? '#ECFDF5' : '#FEF2F2' }]}>
                              <Text style={[styles.typeBadgeText, { color: isCredit ? '#047857' : '#B91C1C' }]}>
                                {isCredit ? 'CREDIT' : 'DEBIT'}
                              </Text>
                            </View>
                            {entry.orderValue ? (
                              <Text style={styles.ledgerOrderVal}>Val: ₹{Number(entry.orderValue).toFixed(0)}</Text>
                            ) : null}
                          </View>
                          <Text style={styles.ledgerDesc} numberOfLines={2}>{description}</Text>
                        </View>

                        <View style={styles.ledgerRight}>
                          <Text style={[styles.ledgerAmount, { color: isCredit ? '#16A34A' : '#DC2626' }]}>
                            {isCredit ? '+' : '-'}{isCredit ? Number(entry.pointsEarned).toFixed(2) : Number(entry.pointsRedeemed).toFixed(2)}
                          </Text>
                          <Text style={styles.ledgerBalance}>Bal: {Number(entry.balance || 0).toFixed(2)}</Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Pagination */}
                  {ledgerTotalPages > 1 && (
                    <View style={styles.paginationRow}>
                      <TouchableOpacity 
                        style={[styles.pageBtn, ledgerPage === 1 && styles.pageBtnDisabled]}
                        onPress={() => setLedgerPage(prev => Math.max(prev - 1, 1))}
                        disabled={ledgerPage === 1}
                      >
                        <Ionicons name="chevron-back" size={16} color={ledgerPage === 1 ? '#CBD5E1' : '#000'} />
                      </TouchableOpacity>
                      <Text style={styles.pageInfo}>Page {ledgerPage} of {ledgerTotalPages}</Text>
                      <TouchableOpacity 
                        style={[styles.pageBtn, ledgerPage === ledgerTotalPages && styles.pageBtnDisabled]}
                        onPress={() => setLedgerPage(prev => Math.min(prev + 1, ledgerTotalPages))}
                        disabled={ledgerPage === ledgerTotalPages}
                      >
                        <Ionicons name="chevron-forward" size={16} color={ledgerPage === ledgerTotalPages ? '#CBD5E1' : '#000'} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* ACTIONS & CODE BOX */}
          <View style={{ width: '100%', marginTop: 8, marginBottom: 8 }}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#E2E8F0', opacity: 0.8 }]}
                disabled={true}
              >
                <MaterialCommunityIcons name="bank-transfer-out" size={18} color={Colors.text.muted} style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: Colors.text.muted }]}>Withdraw Balance (Coming Soon)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerCodeBox}>
              <Text style={styles.footerCodeLabel}>Your Active Referral Code: </Text>
              <Text style={styles.footerCodeVal}>{refCode}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
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
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: Colors.black },
  headerSubtitle: { fontSize: 8, color: Colors.text.muted, fontWeight: '800', letterSpacing: 0.5 },

  content: { padding: 16, flexGrow: 1, justifyContent: 'space-between' },
  topSection: { width: '100%' },

  dashboardCard: { backgroundColor: Colors.white, borderRadius: 24, padding: 18, elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 1.5, borderColor: Colors.border.medium, marginBottom: 18 },
  heroHeader: { flexDirection: 'row', alignItems: 'center' },
  walletIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  walletRule: { fontSize: 11, fontWeight: '900', color: '#B7791F', letterSpacing: 0.5 },
  heroLabel: { fontSize: 14, color: Colors.text.secondary, fontWeight: '600', marginTop: 1 },
  heroBalance: { fontSize: 24, fontWeight: '900', color: Colors.black, marginLeft: 'auto' },
  miniStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  miniStatBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  verticalDivider: { width: 1.2, height: 20, backgroundColor: Colors.border.medium, marginHorizontal: 12 },
  miniLabel: { fontSize: 12, color: Colors.text.muted, fontWeight: '800', marginRight: 8 },
  miniValue: { fontSize: 16, fontWeight: '900', color: Colors.text.primary },

  dashboardDivider: { height: 1.2, backgroundColor: Colors.border.medium, marginVertical: 18 },

  rankBoxesContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rankMetricBox: { flex: 0.46 },
  rankMetricLabel: { fontSize: 9, fontWeight: '800', color: Colors.text.muted, letterSpacing: 0.5, marginBottom: 4 },
  rankValueText: { fontSize: 20, fontWeight: '900', color: Colors.text.primary },
  rankValueTotal: { fontSize: 12, fontWeight: '700', color: Colors.text.muted },
  rankProgressTrack: { height: 6, backgroundColor: Colors.border.light, borderRadius: 3, marginVertical: 6, overflow: 'hidden' },
  rankProgressBar: { height: '100%', borderRadius: 3 },
  rankPercentileHighlight: { fontSize: 10, fontWeight: '700', color: '#D97706', marginLeft: 4 },
  rankTopEarner: { fontSize: 9, fontWeight: '800', color: Colors.text.secondary, marginTop: 4 },
  dashboardVerticalDivider: { width: 1.2, height: 60, backgroundColor: Colors.border.medium },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  actionBtn: { flex: 0.48, height: 44, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 1 },
  actionBtnText: { fontSize: 14, fontWeight: '900', color: Colors.black },

  sectionHeader: { fontSize: 14, fontWeight: '900', color: Colors.black, marginBottom: 8, letterSpacing: 0.5 },

  performanceSection: { marginBottom: 16 },
  tableContainer: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border.medium, elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: Colors.background.secondary, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1.5, borderBottomColor: Colors.border.medium },
  columnHeader: { flex: 1, fontSize: 11, fontWeight: '900', color: Colors.text.primary, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1.2, borderBottomColor: Colors.border.light, alignItems: 'center' },
  rowLabel: { flex: 1.5, fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  rowValue: { flex: 1, fontSize: 12, fontWeight: '800', color: Colors.black, textAlign: 'center' },

  // Ledger Styles
  ledgerSection: { marginBottom: 16 },
  ledgerLoader: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border.medium, padding: 20, alignItems: 'center', justifyContent: 'center' },
  ledgerLoaderText: { marginTop: 8, fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  emptyLedgerBox: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border.medium, padding: 20, alignItems: 'center' },
  emptyLedgerText: { fontSize: 13, fontWeight: '700', color: Colors.text.muted },
  ledgerContainer: { backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border.medium, overflow: 'hidden' },
  ledgerRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.border.light, alignItems: 'center' },
  ledgerLeft: { width: 60 },
  ledgerDate: { fontSize: 12, fontWeight: '700', color: Colors.text.primary },
  ledgerTime: { fontSize: 10, color: Colors.text.muted, marginTop: 1 },
  ledgerMiddle: { flex: 1, paddingHorizontal: 8 },
  typeBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginRight: 6 },
  typeBadgeText: { fontSize: 8, fontWeight: '900' },
  ledgerOrderVal: { fontSize: 10, color: Colors.text.secondary, fontWeight: '700' },
  ledgerDesc: { fontSize: 11, fontWeight: '600', color: Colors.black, lineHeight: 14 },
  ledgerRight: { alignItems: 'flex-end', width: 85 },
  ledgerAmount: { fontSize: 14, fontWeight: '900' },
  ledgerBalance: { fontSize: 10, color: Colors.text.muted, marginTop: 1, fontWeight: '600' },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, backgroundColor: Colors.background.secondary, borderTopWidth: 1, borderTopColor: Colors.border.light },
  pageBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', marginHorizontal: 12, borderWidth: 1, borderColor: Colors.border.medium },
  pageBtnDisabled: { opacity: 0.5 },
  pageInfo: { fontSize: 12, fontWeight: '700', color: Colors.text.primary },

  footerCodeBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAFC', borderStyle: 'dashed', borderWidth: 1.5, borderColor: Colors.border.medium, padding: 12, borderRadius: 12, marginTop: 8 },
  footerCodeLabel: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary },
  footerCodeVal: { fontSize: 14, fontWeight: '900', color: Colors.secondary }
});
