import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface EditableVariantRowProps {
  v: any;
  pId: string;
  item: any;
  onToggleSelect: (pId: string, sku: string) => void;
  onUpdateField: (pId: string, sku: string, field: 'vendorPrice' | 'stock', value: string) => void;
}

const EditableVariantRowComponent: React.FC<EditableVariantRowProps> = ({ v, pId, item, onToggleSelect, onUpdateField }) => {
  const [localPrice, setLocalPrice] = useState(String(v.vendorPrice || ''));
  const [localStock, setLocalStock] = useState(String(v.stock || ''));

  useEffect(() => {
    setLocalPrice(String(v.vendorPrice || ''));
    console.log("VENDOR PRICE: ", v.vendorPrice);
  }, [v.vendorPrice]);

  useEffect(() => {
    setLocalStock(String(v.stock || ''));
  }, [v.stock]);

  const handlePriceBlur = () => {
    onUpdateField(pId, v.sku, 'vendorPrice', localPrice);
  };

  const handleStockBlur = () => {
    onUpdateField(pId, v.sku, 'stock', localStock);
  };

  return (
    <View style={[styles.variantRow, v.selected ? styles.variantRowSelected : null]}>
      <View style={styles.variantHeader}>
        <TouchableOpacity
          style={[styles.checkbox, v.selected ? styles.checkboxChecked : null]}
          onPress={() => onToggleSelect(pId, v.sku)}
        >
          {v.selected && <Text style={styles.checkboxTick}>✓</Text>}
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.variantName}>{v.name}</Text>
          <Text style={styles.variantSku}>Product Code: {v.productCode || v.sku || ''}</Text>
          {item.catalogStatus === 'active' && (() => {
            const globalVar = item.productId?.variants?.find((gv: any) => gv.sku === v.sku);
            const listPrice = globalVar?.pricing?.vendorListPrice || v.pricing?.vendorListPrice || 0;
            return (
              <Text style={styles.listPriceText}>
                Vendor List Price: ₹{listPrice} (inclusive of all taxes)
              </Text>
            );
          })()}
        </View>

        {v.isHotSelling && (
          <View style={[styles.miniHotSelling, styles.miniHotSellingActive]}>
            <Text style={styles.miniHotSellingText}>🔥 Hot</Text>
          </View>
        )}
      </View>

      {v.selected && (
        <View style={styles.variantInputsRow}>
          <View style={styles.variantInputCol}>
            <Text style={styles.inlineLabel}>Offer Price</Text>
            <Text style={styles.taxLabel}>(inclusive of all taxes)</Text>
            <View style={[styles.priceInputBox, v.isPriceInvalid ? { borderColor: 'red', borderWidth: 1.5 } : null]}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={[styles.inlineInput, { paddingLeft: 18 }]}
                keyboardType="decimal-pad"
                value={localPrice}
                onChangeText={setLocalPrice}
                onBlur={handlePriceBlur}
              />
            </View>
          </View>
          <View style={styles.variantInputCol}>
            <Text style={styles.inlineLabel}>Quantity</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>(min. stock to maintain)</Text>
            <TextInput
              style={[styles.inlineInput, v.isStockInvalid ? { borderColor: 'red', borderWidth: 1.5 } : null]}
              keyboardType="decimal-pad"
              value={localStock}
              onChangeText={setLocalStock}
              onBlur={handleStockBlur}
            />
          </View>
        </View>
      )}
    </View>
  );
};

export const EditableVariantRow = React.memo(EditableVariantRowComponent);

const styles = StyleSheet.create({
  variantRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    // backgroundColor: '#1b75cfff',
  },
  variantRowSelected: {
    // backgroundColor: '#ce4e4eff',
  },
  variantHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  checkboxTick: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  variantName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.black,
  },
  variantSku: {
    fontSize: 12,
    color: Colors.text.muted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  listPriceText: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: '600',
    marginTop: 4,
  },
  miniHotSelling: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  miniHotSellingActive: {
    backgroundColor: '#FEF3C7',
  },
  miniHotSellingText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D97706',
  },
  variantInputsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
    paddingLeft: 30,
  },
  variantInputCol: {
    flex: 1,
  },
  inlineLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 2,
  },
  taxLabel: {
    fontSize: 10,
    color: Colors.text.muted,
    marginBottom: 6,
  },
  priceInputBox: {
    position: 'relative',
    justifyContent: 'center',
  },
  rupeeSymbol: {
    position: 'absolute',
    left: 10,
    top: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.black,
    zIndex: 1,
  },
  inlineInput: {
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: Colors.white,
    color: Colors.black,
  },
});
