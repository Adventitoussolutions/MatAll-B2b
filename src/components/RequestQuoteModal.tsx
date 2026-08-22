import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import QtySelector from './QtySelector';
import Toast from 'react-native-toast-message';

import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

interface RequestQuoteModalProps {
  visible: boolean;
  onClose: () => void;
  product: any;
  variant: any;
}

export default function RequestQuoteModal({ visible, onClose, product, variant }: RequestQuoteModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [requiredBy, setRequiredBy] = useState('Today');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        productId: product?._id || product?.id,
        productName: product?.name || product?.productName,
        variantId: variant?._id || variant?.id,
        variantName: variant?.name || Object.entries(variant?.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', '),
        quantity: quantity,
        requiredBy: requiredBy,
        address: "" // Optional/Placeholder as per user payload
      };

      await api.post('/api/on-demand', payload);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit quote request', err);
      Toast.show({
        type: 'error',
        text1: 'Submission Failed',
        text2: 'Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setQuantity(1);
    setRequiredBy('Today');
    onClose();
  };

  if (submitted) {
    return (
      <Modal visible={visible} animationType="fade" transparent={true}>
        <View style={styles.overlay}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                 <Text style={styles.title}>Place{"\n"}Request</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.successContent}>
              <View style={styles.successIconBox}>
                <Ionicons name="checkmark-circle" size={80} color="#16A34A" />
              </View>
              <Text style={styles.successTitle}>Request Submitted!</Text>
              <Text style={styles.successSubtitle}>
                Our team will contact you shortly{"\n"}with the best quote and{"\n"}availability.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.overlay}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Place{"\n"}Request</Text>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{product?.name || product?.productName}</Text>
                  <View style={styles.variantBadge}>
                    <Text style={styles.variantText}>
                       {variant?.name || Object.entries(variant?.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <Text style={styles.sectionLabel}>SET QUANTITY</Text>
              <View style={styles.qtyContainer}>
                <QtySelector 
                  quantity={quantity}
                  onUpdate={(delta) => setQuantity(prev => Math.max(1, prev + delta))}
                  onSet={(val) => setQuantity(Math.max(1, val))}
                  containerStyle={styles.qtySelector}
                  btnStyle={styles.qtyBtn}
                  inputStyle={styles.qtyInput}
                  iconColor={Colors.black}
                  iconSize={24}
                />
              </View>

              <Text style={styles.sectionLabel}>REQUIRED BY WHEN?</Text>
              <View style={styles.optionsRow}>
                {['Today', 'Tomorrow', 'Later'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionCard, requiredBy === option && styles.activeOptionCard]}
                    onPress={() => setRequiredBy(option)}
                  >
                    <Ionicons 
                      name={option === 'Today' ? "time-outline" : option === 'Tomorrow' ? "calendar-outline" : "calendar-outline"} 
                      size={24} 
                      color={requiredBy === option ? Colors.white : Colors.text.primary} 
                    />
                    <Text style={[styles.optionText, requiredBy === option && styles.activeOptionText]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.noteBox}>
                <Text style={styles.noteText}>
                  Note: "On Demand" products require manual coordination for the best logistics efficiency. No payment is required right now.
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.submitBtnText}>Send Request</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.ui.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  content: {
    backgroundColor: Colors.white,
    width: '100%',
    borderRadius: 30,
    padding: 24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text.primary,
    lineHeight: 32,
    marginRight: 15
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 4
  },
  variantBadge: {
    backgroundColor: Colors.border.light,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 30,
    alignSelf: 'flex-start'
  },
  variantText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.secondary
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border.light,
    justifyContent: 'center',
    alignItems: 'center'
  },
  body: {
    marginTop: 10
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 12,
    letterSpacing: 0.5
  },
  qtyContainer: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 15,
    padding: 5
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 10
  },
  qtyBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light
  },
  qtyInput: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text.primary,
    textAlign: 'center'
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  optionCard: {
    flex: 1,
    height: 100,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5
  },
  activeOptionCard: {
    backgroundColor: Colors.black,
    borderColor: Colors.black
  },
  optionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary
  },
  activeOptionText: {
    color: Colors.white
  },
  noteBox: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 24
  },
  noteText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 18
  },
  submitBtn: {
    backgroundColor: Colors.black,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800'
  },
  successContent: {
    alignItems: 'center',
    paddingVertical: 30
  },
  successIconBox: {
    marginBottom: 20
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.black,
    marginBottom: 15
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600'
  }
});
