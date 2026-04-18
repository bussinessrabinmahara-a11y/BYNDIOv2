export function sanitizeText(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

export function sanitizeHtml(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

export function escapeJsString(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

export const validators = {
  required: (value: string, fieldName: string): string | null => {
    if (!value || !value.trim()) return `${fieldName} is required`;
    return null;
  },

  phone: (value: string): string | null => {
    if (!/^\d{10}$/.test(value)) return 'Phone number must be 10 digits';
    return null;
  },

  pincode: (value: string): string | null => {
    if (!/^\d{6}$/.test(value)) return 'PIN code must be 6 digits';
    return null;
  },

  email: (value: string): string | null => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Enter a valid email address';
    }
    return null;
  },

  password: (value: string): string | null => {
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
    return null;
  },

  name: (value: string): string | null => {
    if (!value.trim() || value.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (value.trim().length > 60) return 'Name is too long';
    return null;
  },
};

export function validateAddress(address: {
  fullName: string;
  mobile: string;
  line1: string;
  city: string;
  pin: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const nameErr = validators.name(address.fullName);
  if (nameErr) errors.fullName = nameErr;

  const phoneErr = validators.phone(address.mobile);
  if (phoneErr) errors.mobile = phoneErr;

  const line1Err = validators.required(address.line1, 'Address');
  if (line1Err) errors.line1 = line1Err;

  const cityErr = validators.required(address.city, 'City');
  if (cityErr) errors.city = cityErr;

  const pinErr = validators.pincode(address.pin);
  if (pinErr) errors.pin = pinErr;

  return errors;
}
