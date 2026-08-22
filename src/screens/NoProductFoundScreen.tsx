import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Linking
} from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

export default function NoProductFoundScreen({ navigation }: any) {
  const handleWhatsApp = () => {
    const phoneNumber = '919216921698';
    const message = 'Hi, I couldn\'t find a product on MatAll. Can you help?';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => {
      Toast.show({ type: 'error', text1: 'WhatsApp Error', text2: 'Could not open WhatsApp. Please make sure it is installed.' });
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>No Results</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MainTab', { screen: 'HOME' })}>
          <Ionicons name="home-outline" size={24} color={Colors.black} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.noResultsText}>
          No products found for this selection.
        </Text>

        <TouchableOpacity 
          style={styles.whatsappBtn}
          onPress={handleWhatsApp}
        >
          <MaterialCommunityIcons name="whatsapp" size={28} color="#fff" style={{ marginRight: 12 }} />
          <Text style={styles.whatsappBtnText}>Contact us on WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.black },
  backBtn: { padding: 4 },
  content: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100, // Offset to push it slightly up from center
  },
  noResultsText: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#94A3B8', 
    textAlign: 'center', 
    marginBottom: 40,
    lineHeight: 28,
  },
  whatsappBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#22C55E', 
    paddingVertical: 20, 
    paddingHorizontal: 32, 
    borderRadius: 40,
    elevation: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  whatsappBtnText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '800' 
  },
});
