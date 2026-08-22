/**
 * Safely parses a price value to a number.
 * Handles strings with currency symbols, commas, and null/undefined values.
 */
export const safeParsePrice = (price: any): number => {
  if (price === null || price === undefined) {
    if (__DEV__ && price !== undefined) console.log('[safeParsePrice] Received null price');
    return 0;
  }
  
  if (typeof price === 'number') {
    if (isNaN(price)) {
      if (__DEV__) console.warn('[safeParsePrice] Received NaN number');
      return 0;
    }
    return price;
  }
  
  if (typeof price === 'string') {
    // Remove everything except numbers, decimal point, and minus sign
    const hasComma = price.includes(',');
    const hasDot = price.includes('.');
    
    let sanitized = price;
    if (hasComma && !hasDot) {
      if (price.split(',')[1]?.length === 2) {
        sanitized = price.replace(',', '.');
      } else {
        sanitized = price.replace(/,/g, '');
      }
    } else if (hasComma && hasDot) {
      if (price.lastIndexOf(',') > price.lastIndexOf('.')) {
        sanitized = price.replace(/\./g, '').replace(',', '.');
      } else {
        sanitized = price.replace(/,/g, '');
      }
    } else {
      sanitized = price.replace(/,/g, '');
    }
    
    const cleaned = sanitized.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed)) {
      if (__DEV__) console.warn(`[safeParsePrice] Failed to parse string: "${price}"`);
      return 0;
    }
    return parsed;
  }

  if (typeof price === 'object') {
    // Handle case where price might be an object like { amount: 100 }
    const possibleValue = price.amount ?? price.value ?? price.price ?? price.salePrice;
    if (possibleValue !== undefined) {
      return safeParsePrice(possibleValue);
    }
    if (__DEV__) console.warn('[safeParsePrice] Received object without known price fields', price);
  }
  
  if (__DEV__) console.warn(`[safeParsePrice] Received unsupported type: ${typeof price}`, price);
  return 0;
};
