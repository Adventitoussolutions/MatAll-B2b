import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/Colors';

type Props = {
  quantity: number;
  onUpdate: (delta: number) => void;
  onSet: (val: number) => void;
  containerStyle?: any;
  btnStyle?: any;
  inputStyle?: any;
  iconColor?: string;
  iconSize?: number;
};

export default function QtySelector({ 
  quantity, 
  onUpdate, 
  onSet, 
  containerStyle, 
  btnStyle, 
  inputStyle, 
  iconColor = Colors.white, 
  iconSize = 18 
}: Props) {
  const [localQty, setLocalQty] = useState(String(quantity));

  useEffect(() => {
    setLocalQty(String(quantity));
  }, [quantity]);

  const handleQtyChange = (text: string) => {
    const cleanedText = text.replace(/[^0-9]/g, '');
    setLocalQty(cleanedText);
    const val = parseInt(cleanedText);
    if (!isNaN(val)) {
      onSet(val);
    }
  };

  const handleQtyBlur = () => {
    if (localQty === '' || parseInt(localQty) === 0) {
      onSet(0);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity onPress={() => onUpdate(-1)} style={[styles.btn, btnStyle]}>
        <Ionicons name="remove" size={iconSize} color={iconColor} />
      </TouchableOpacity>
      <TextInput
        style={[styles.input, inputStyle]}
        value={localQty}
        keyboardType="numeric"
        onChangeText={handleQtyChange}
        onBlur={handleQtyBlur}
        selectTextOnFocus
      />
      <TouchableOpacity onPress={() => onUpdate(1)} style={[styles.btn, btnStyle]}>
        <Ionicons name="add" size={iconSize} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  btn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  input: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.black,
    textAlign: 'center',
    minWidth: 20,
    padding: 0,
    marginHorizontal: 8
  }
});
