// Canonicalize Indian dialling formats and explicitly international numbers.
/** @param {string} value */
export function normalizeLeadPhone(value) {
  const phone = value.trim();
  if (!/^\+?[\d\s().-]+$/.test(phone)) return null;

  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) {
    return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  }

  const indianNumber = digits.replace(/^(?:0|91)(?=\d{10}$)/, '');
  return /^[1-9]\d{9}$/.test(indianNumber) ? `+91${indianNumber}` : null;
}
