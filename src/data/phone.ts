/**
 * US phone numbers only (NANP): 10 digits, optionally prefixed with 1 / +1.
 * Area code and exchange can't start with 0 or 1. Shared by the signup form and API.
 */
export const phoneMaxLength = 17; // "+1 (720) 245-0588"
export function formatUsPhone(value: string): string | null {
  if (!/^[+\d\s().-]*$/.test(value) || value.length > phoneMaxLength) return null;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
