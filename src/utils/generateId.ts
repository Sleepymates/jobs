/**
 * Generate a random string of the specified length
 */
export const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a random job ID (e.g., abc123)
 */
export const generateJobId = (): string => {
  return generateRandomString(6);
};

/**
 * Generate a random passcode (6-8 digits)
 */
export const generatePasscode = (): string => {
  const length = Math.floor(Math.random() * 3) + 6; // 6-8 digits
  const digits = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return result;
};