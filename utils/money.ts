/**
 * Formats a number as a currency string (e.g., $1,234.56).
 */
export const formatMoney = (amount: number, currency: string = "CAD") => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

/**
 * Rounds currency math to cents to avoid floating point display/storage noise.
 */
export const roundMoney = (amount: number): number => {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

/**
 * Formats a string as the user types (adds commas, limits decimals).
 * Use this for TextInput onChangeText.
 */
export const formatBalanceAsYouType = (text: string) => {
  // Remove anything that's not a digit or a period
  let clean = text.replace(/[^0-9.]/g, '');
  
  // Handle multiple periods
  const parts = clean.split('.');
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('');
  }
  
  const splitClean = clean.split('.');
  // Add commas to the integer part
  let formatted = splitClean[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  // Add the decimal part (limit to 2 digits)
  if (splitClean.length > 1) {
    formatted += '.' + splitClean[1].substring(0, 2);
  }
  
  return formatted;
};

/**
 * Formats a string to a standard currency format with 2 decimal places.
 * Use this for TextInput onBlur.
 */
export const formatBalanceOnBlur = (text: string) => {
  const clean = text.replace(/,/g, '');
  if (!clean) return '';
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return text;
  return parsed.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Parses a formatted currency string (with commas) back to a clean number.
 * Use this before saving to the database.
 */
export const cleanMoneyInput = (value: string, fallback: number = 0): number => {
  const trimmed = value.trim().replace(/,/g, '');
  if (trimmed.length === 0) return fallback;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
};
