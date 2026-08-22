import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getFullImageUrl } from '../utils/imageUrl';
import QtySelector from './QtySelector';

import { Colors } from '../constants/Colors';
import { safeParsePrice } from '../utils/priceUtils';

interface VariantModalProps {
  visible: boolean;
  onClose: () => void;
  selectedProduct: any;
  getVariantQty: (id: string) => number;
  updateGlobalQty: (id: string, delta: number) => void;
  setQuantity: (id: string, val: number) => void;
  handleVariantAdd: (variantItem: any) => void;
  onRequestQuote?: (selectedModalVariant: any) => void;
}

export default function VariantModal({
  visible,
  onClose,
  selectedProduct,
  getVariantQty,
  updateGlobalQty,
  setQuantity,
  handleVariantAdd,
  onRequestQuote
}: VariantModalProps) {

  const insets = useSafeAreaInsets();
  const [modalSelections, setModalSelections] = useState<Record<string, string>>({});

  const attrKeys = useMemo(() => {
    if (!selectedProduct?.variants?.length) return [];
    return Object.keys(selectedProduct.variants[0].attributes || {}).filter(k => {
      const lowKey = k.toLowerCase().trim();
      return lowKey !== 'pack of' && lowKey !== 'sold as';
    });
  }, [selectedProduct]);

  const availableOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {};
    if (!selectedProduct?.variants) return options;

    attrKeys.forEach((attr, index) => {
      options[attr] = new Set();
      
      selectedProduct.variants.forEach((v: any) => {
        let matchesPrevious = true;
        for (let i = 0; i < index; i++) {
          const prevAttr = attrKeys[i];
          if (v.attributes[prevAttr] !== modalSelections[prevAttr]) {
            matchesPrevious = false;
            break;
          }
        }
        
        if (matchesPrevious && v.attributes[attr]) {
          options[attr].add(v.attributes[attr]);
        }
      });
    });
    return options;
  }, [selectedProduct, attrKeys, modalSelections]);

  useEffect(() => {
    if (selectedProduct?.variants?.length > 0) {
      const firstVariant = selectedProduct.variants[0];
      const initial: Record<string, string> = {};
      Object.keys(firstVariant.attributes || {}).forEach(attr => {
        initial[attr] = firstVariant.attributes[attr];
      });
      if (JSON.stringify(initial) !== JSON.stringify(modalSelections)) {
        setModalSelections(initial);
      }
    } else {
      setModalSelections({});
    }
  }, [selectedProduct]);

  const handleSelectAttribute = (attrName: string, value: string) => {
    setModalSelections(prev => {
      const nextSelections = { ...prev, [attrName]: value };
      let matchingVariants = selectedProduct.variants;
      
      attrKeys.forEach(key => {
        const targetValue = key === attrName ? value : nextSelections[key];
        const filtered = matchingVariants.filter((v: any) => v.attributes && v.attributes[key] === targetValue);
        
        if (filtered.length > 0) {
            matchingVariants = filtered;
            nextSelections[key] = targetValue;
        } else {
            nextSelections[key] = matchingVariants[0].attributes[key];
        }
      });
      return nextSelections;
    });
  };

  const selectedModalVariant = useMemo(() => {
    if (!selectedProduct?.variants) return selectedProduct;
    return selectedProduct.variants.find((v: any) => {
      return Object.entries(modalSelections).every(([attr, val]) => v.attributes && v.attributes[attr] === val);
    }) || selectedProduct.variants[0];
  }, [selectedProduct, modalSelections]);

  const { currentPrice, currentMrp, discount } = useMemo(() => {
    const p = safeParsePrice(
      selectedModalVariant?.pricing?.b2bBuyingPrice ||
      selectedModalVariant?.b2bBuyingPrice ||
      selectedProduct?.pricing?.b2bBuyingPrice ||
      selectedProduct?.b2bBuyingPrice ||
      selectedModalVariant?.pricing?.matallBuyingPrice ||
      selectedModalVariant?.matallBuyingPrice ||
      selectedProduct?.pricing?.matallBuyingPrice ||
      selectedProduct?.matallBuyingPrice ||
      0
    );
    return { currentPrice: p, currentMrp: 0, discount: 0 };
  }, [selectedModalVariant, selectedProduct]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.variantModalContent, { paddingBottom: Math.max(insets.bottom, 60) }]}>
            <View style={styles.variantModalHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.variantProductTitle} numberOfLines={2}>{selectedProduct?.name || selectedProduct?.productName}</Text>
                <Text style={styles.variantSelectLabel}>SELECT VARIANT</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.variantCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.black} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {selectedModalVariant && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 15, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <View style={{ position: 'relative' }}>
                    <Image 
                      source={{ uri: getFullImageUrl(selectedModalVariant.imageUrl || selectedModalVariant.image || selectedModalVariant.images?.[0] || selectedProduct?.imageUrl) }} 
                      style={{ width: 80, height: 80, borderRadius: 12, marginRight: 15, backgroundColor: Colors.white }} 
                      contentFit="contain"
                    />
                    {discount > 0 && (
                      <View style={{ position: 'absolute', top: -5, left: -5, backgroundColor: '#2563EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 10 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{discount}% OFF</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 6 }}>
                      {Object.entries(selectedModalVariant.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Standard'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                        ₹{currentPrice.toFixed(2)}
                      </Text>
                      {currentMrp > currentPrice && currentMrp > 0 && (
                        <Text style={{ fontSize: 13, color: '#94A3B8', textDecorationLine: 'line-through', marginLeft: 10, fontWeight: '500' }}>
                          ₹{currentMrp.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {attrKeys.map(attr => (
                <View key={attr} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: Colors.text.primary, marginBottom: 8, textTransform: 'uppercase' }}>
                    SELECT {attr}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {Array.from(availableOptions[attr] || []).map(val => {
                      const isSelected = modalSelections[attr] === val;
                      return (
                        <TouchableOpacity
                          key={val as string}
                          style={[styles.blackPill, isSelected && styles.blackPillSelected]}
                          onPress={() => handleSelectAttribute(attr, val as string)}
                        >
                          <Text style={[styles.blackPillText, isSelected && styles.blackPillTextSelected]}>{val as string}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={{ marginTop: 10 }}>
              {selectedProduct?.deliveryTime === 'On Demand' ? (
                <TouchableOpacity 
                  style={styles.addToCartBtnModal} 
                  onPress={() => {
                    onClose();
                    if (onRequestQuote) onRequestQuote(selectedModalVariant);
                  }}
                >
                  <Text style={styles.addToCartTextModal}>REQUEST QUOTE</Text>
                </TouchableOpacity>
              ) : selectedModalVariant && getVariantQty(selectedModalVariant._id || selectedModalVariant.id) > 0 ? (
                <QtySelector
                  quantity={getVariantQty(selectedModalVariant._id || selectedModalVariant.id)}
                  onUpdate={(delta) => updateGlobalQty(selectedModalVariant._id || selectedModalVariant.id, delta)}
                  onSet={(val) => setQuantity(selectedModalVariant._id || selectedModalVariant.id, val)}
                  containerStyle={styles.qtySelectorLargeModal}
                  btnStyle={styles.qtyBtnLargeModal}
                  inputStyle={styles.qtyTextLargeModal}
                  iconColor={Colors.white}
                  iconSize={24}
                />
              ) : (
                <TouchableOpacity style={styles.addToCartBtnModal} onPress={() => handleVariantAdd({
                  ...selectedProduct,
                  ...selectedModalVariant,
                  _id: selectedModalVariant?._id || selectedModalVariant?.id,
                  name: selectedProduct?.name || selectedProduct?.productName || selectedModalVariant?.name,
                  selectedVariant: Object.entries(selectedModalVariant?.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Standard',
                  attributes: selectedModalVariant?.attributes,
                  price: selectedModalVariant?.pricing?.b2bBuyingPrice ?? selectedModalVariant?.b2bBuyingPrice ?? selectedProduct?.pricing?.b2bBuyingPrice ?? selectedProduct?.b2bBuyingPrice ?? selectedModalVariant?.pricing?.matallBuyingPrice ?? selectedModalVariant?.matallBuyingPrice ?? selectedProduct?.pricing?.matallBuyingPrice ?? selectedProduct?.matallBuyingPrice ?? 0,
                  image: selectedModalVariant?.imageUrl || selectedModalVariant?.image || selectedModalVariant?.images?.[0] || selectedProduct?.imageUrl,
                  imageUrl: selectedModalVariant?.imageUrl || selectedModalVariant?.image || selectedModalVariant?.images?.[0] || selectedProduct?.imageUrl,
                  brand: selectedProduct?.brand || selectedModalVariant?.brand
                })}>
                  <Text style={styles.addToCartTextModal}>ADD TO CART</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: Colors.ui.overlay, justifyContent: 'flex-end' },
  variantModalContent: { backgroundColor: Colors.white, width: '100%', maxHeight: '90%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, elevation: 20, shadowColor: Colors.black, shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.2, shadowRadius: 15 },
  variantModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border.light },
  variantProductTitle: { fontSize: 18, fontWeight: '900', color: Colors.black },
  variantSelectLabel: { fontSize: 11, fontWeight: '700', color: Colors.text.muted, marginTop: 2 },
  variantCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border.light, justifyContent: 'center', alignItems: 'center' },
  blackPill: {
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    minWidth: '22%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blackPillSelected: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  blackPillText: { color: '#334155', fontSize: 13, fontWeight: '700' },
  blackPillTextSelected: { color: Colors.primary, fontWeight: '900' },
  addToCartBtnModal: {
    backgroundColor: Colors.black,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  addToCartTextModal: { color: Colors.primary, fontSize: 16, fontWeight: '900' },
  qtySelectorLargeModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.black,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    justifyContent: 'space-between',
    width: '100%',
  },
  qtyBtnLargeModal: { padding: 10, justifyContent: 'center', alignItems: 'center' },
  qtyTextLargeModal: { color: Colors.white, fontSize: 18, fontWeight: '900', marginHorizontal: 15 },
});
