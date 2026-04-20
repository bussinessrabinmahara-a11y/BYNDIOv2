/**
 * BYNDIO GST Compliance Utility
 * Handles all GST-related logic for buyer-seller state matching
 * 
 * Indian GST Law: Sellers without GST registration can only sell
 * within their registered state (intrastate). Interstate sales
 * require GST registration (IGST).
 */

// All Indian States & Union Territories
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu', 'Delhi',
  'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const;

export type IndianState = typeof INDIAN_STATES[number];

/**
 * Check if a product can be sold to a buyer based on GST compliance
 * 
 * Rules:
 * 1. If seller has GST → can sell to any state (pan-India)
 * 2. If seller doesn't have GST → can only sell within their state
 * 3. If seller state is unknown → allow (graceful degradation)
 * 4. If buyer state is unknown → allow (can't restrict without knowing)
 */
export function canSellerShipToState(
  sellerState: string | null | undefined,
  sellerHasGst: boolean,
  buyerState: string | null | undefined
): { allowed: boolean; reason?: string } {
  // If seller has GST, they can sell pan-India
  if (sellerHasGst) {
    return { allowed: true };
  }

  // If we don't know the seller's state, allow (graceful degradation)
  if (!sellerState) {
    return { allowed: true };
  }

  // If we don't know the buyer's state, allow (can't restrict)
  if (!buyerState) {
    return { allowed: true };
  }

  // Normalize state names for comparison
  const normalizedSeller = sellerState.trim().toLowerCase();
  const normalizedBuyer = buyerState.trim().toLowerCase();

  // Same state → always allowed
  if (normalizedSeller === normalizedBuyer) {
    return { allowed: true };
  }

  // Different state + no GST → restricted
  return {
    allowed: false,
    reason: `This seller is located in ${sellerState} and is not GST registered. They can only ship within ${sellerState}.`,
  };
}

/**
 * Check an entire cart for GST compliance issues
 */
export function checkCartCompliance(
  cartItems: Array<{
    id: string | number;
    name: string;
    seller_state?: string | null;
    seller_has_gst?: boolean;
  }>,
  buyerState: string | null | undefined
): {
  hasIssues: boolean;
  restrictedItems: Array<{ id: string | number; name: string; sellerState: string }>;
  allowedItems: Array<{ id: string | number; name: string }>;
} {
  const restricted: Array<{ id: string | number; name: string; sellerState: string }> = [];
  const allowed: Array<{ id: string | number; name: string }> = [];

  for (const item of cartItems) {
    const check = canSellerShipToState(
      item.seller_state,
      item.seller_has_gst ?? false,
      buyerState
    );

    if (check.allowed) {
      allowed.push({ id: item.id, name: item.name });
    } else {
      restricted.push({
        id: item.id,
        name: item.name,
        sellerState: item.seller_state || 'Unknown',
      });
    }
  }

  return {
    hasIssues: restricted.length > 0,
    restrictedItems: restricted,
    allowedItems: allowed,
  };
}

/**
 * Get a user-friendly message for GST restriction
 */
export function getGstRestrictionMessage(sellerState: string, buyerState: string): string {
  return `This seller is based in ${sellerState} and is not GST registered. As per Indian GST law, non-registered sellers can only sell within their state. Since you are in ${buyerState}, this product cannot be shipped to you.`;
}

/**
 * Get a short badge message for product cards
 */
export function getShippingBadge(
  sellerState: string | null | undefined,
  sellerHasGst: boolean
): { text: string; type: 'pan-india' | 'state-only' | 'unknown' } {
  if (sellerHasGst) {
    return { text: 'Ships Pan-India', type: 'pan-india' };
  }
  if (sellerState) {
    return { text: `Ships within ${sellerState} only`, type: 'state-only' };
  }
  return { text: 'Shipping info unavailable', type: 'unknown' };
}

/**
 * Derive buyer state from PIN code (first 2 digits map to state)
 * This is an approximation - real implementation would use postal API
 */
export function getStateFromPincode(pincode: string): string | null {
  if (!pincode || pincode.length < 2) return null;
  
  const prefix = pincode.substring(0, 2);
  const PIN_STATE_MAP: Record<string, string> = {
    '11': 'Delhi', '12': 'Haryana', '13': 'Haryana',
    '14': 'Punjab', '15': 'Punjab', '16': 'Chandigarh',
    '17': 'Himachal Pradesh', '18': 'Jammu & Kashmir',
    '19': 'Jammu & Kashmir', '20': 'Uttar Pradesh',
    '21': 'Uttar Pradesh', '22': 'Uttar Pradesh',
    '23': 'Uttar Pradesh', '24': 'Uttar Pradesh',
    '25': 'Uttar Pradesh', '26': 'Uttarakhand',
    '27': 'Uttar Pradesh', '28': 'Uttar Pradesh',
    '30': 'Rajasthan', '31': 'Rajasthan', '32': 'Rajasthan',
    '33': 'Rajasthan', '34': 'Rajasthan',
    '36': 'Gujarat', '37': 'Gujarat', '38': 'Gujarat',
    '39': 'Gujarat', '40': 'Maharashtra', '41': 'Maharashtra',
    '42': 'Maharashtra', '43': 'Maharashtra', '44': 'Maharashtra',
    '45': 'Madhya Pradesh', '46': 'Madhya Pradesh',
    '47': 'Madhya Pradesh', '48': 'Madhya Pradesh',
    '49': 'Chhattisgarh', '50': 'Telangana', '51': 'Telangana',
    '52': 'Andhra Pradesh', '53': 'Andhra Pradesh',
    '56': 'Karnataka', '57': 'Karnataka', '58': 'Karnataka',
    '59': 'Karnataka', '60': 'Tamil Nadu', '61': 'Tamil Nadu',
    '62': 'Tamil Nadu', '63': 'Tamil Nadu', '64': 'Tamil Nadu',
    '67': 'Kerala', '68': 'Kerala', '69': 'Kerala',
    '70': 'West Bengal', '71': 'West Bengal', '72': 'West Bengal',
    '73': 'West Bengal', '74': 'West Bengal', '75': 'Odisha',
    '76': 'Odisha', '77': 'Odisha', '78': 'Assam',
    '79': 'Arunachal Pradesh', '80': 'Bihar', '81': 'Bihar',
    '82': 'Bihar', '83': 'Bihar', '84': 'Bihar',
    '85': 'Jharkhand', '86': 'Jharkhand',
    '90': 'Manipur', '91': 'Mizoram', '92': 'Nagaland',
    '93': 'Tripura', '94': 'Meghalaya', '95': 'Sikkim',
  };
  
  return PIN_STATE_MAP[prefix] || null;
}
