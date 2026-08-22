import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/Colors';

export default function AddressScreen({ navigation }: any) {
  const { user, updateUser, refreshProfile } = useAuth();

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshProfile();
    });
    return unsubscribe;
  }, [navigation]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          // Delete by sending the updated jobsites array to the profile update API
          const updatedJobsites = jobsites.filter((item: any) => item._id !== id);
          const { data } = await api.put('/api/auth/profile', { jobsites: updatedJobsites });
          
          updateUser(data.user || data);
          Toast.show({
            type: 'success',
            text1: 'Address Deleted',
            text2: 'The address has been removed from your profile.'
          });
        } catch (err) {
          Toast.show({
            type: 'error',
            text1: 'Delete Failed',
            text2: 'Could not delete the address. Please try again.'
          });
        }
      }}
    ]);
  };

  const handleEdit = (address: any) => {
    navigation.navigate('AddAddress', { editAddress: address });
  };

  const jobsites = user?.jobsites || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Saved Addresses</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={Colors.black} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {jobsites.length === 0 ? (
          <View style={{ height: 300, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="location-outline" size={64} color={Colors.border.medium} />
            <Text style={{ fontSize: 16, color: Colors.text.muted, marginTop: 10 }}>No saved addresses found</Text>
          </View>
        ) : (
          jobsites.map((item: any) => (
            <View key={item._id} style={styles.addressCard}>
              <View style={styles.cardRow}>
                <View style={styles.historyIconBox}>
                  <Ionicons name="location-outline" size={20} color={Colors.black} />
                </View>
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLabel}>{user?.fullName || item.name}</Text>
                  <Text style={styles.addressText}>{item.addressText || item.address}</Text>
                  {(item.contactPhone || item.contactNumber) ? (
                    <Text style={styles.phoneText}>Ph: {item.contactPhone || item.contactNumber}</Text>
                  ) : null}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => handleEdit(item)}
                  >
                    <Feather name="edit-2" size={18} color={Colors.black} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddAddress')}
        >
          <Text style={styles.addBtnText}>+ Add New Address</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.black },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: { paddingHorizontal: 16 },
  addressCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.background.secondary,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardRow: { flexDirection: 'row' },
  historyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 16, fontWeight: '900', color: Colors.black, marginBottom: 4 },
  addressText: { fontSize: 13, color: Colors.text.muted, lineHeight: 18, fontWeight: '600' },
  phoneText: { fontSize: 13, fontWeight: '700', color: Colors.text.muted, marginTop: 8 },
  cardActions: { flexDirection: 'row', alignItems: 'flex-start' },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    backgroundColor: Colors.black,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  addBtnText: { color: Colors.white, fontSize: 16, fontWeight: '900' },
});
