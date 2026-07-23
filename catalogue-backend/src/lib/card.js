// This script provides utility functions for validating and normalizing credit card numbers and expiration dates

// Normalize a credit card number by removing spaces and hyphens
export function normalizeCardNumber(value) {
    return String(value).replace(/[\s-]/g, '');
}

// Validate a credit card number using the Luhn algorithm
// ** LUHN ALGORITHM: Validates an identification number by doubling alternating digits and checking whether the total is divisible by 10 ** 
export function isLuhnValid(value) {
    const digits = normalizeCardNumber(value);
    if (!/^\d{12,19}$/.test(digits)) return false;
    let sum = 0;
    let double = false;
    
    for (let index = digits.length - 1; index >= 0; index -= 1) {
        let digit = Number(digits[index]);
        if (double) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        
        sum += digit;
        double = !double;
    }
    return sum % 10 === 0;
}

// Validate a credit card expiration date in the format MM/YYYY and check if it is in the future
export function isFutureExpiration(value, now = new Date()) {
    const match = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(value);
    if (!match) return false;
    
    const month = Number(match[1]);
    const year = Number(match[2]);
    
    return year > now.getUTCFullYear()
        || (year === now.getUTCFullYear() && month >= now.getUTCMonth() + 1);
}
