import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  calculateDistance,
  calculateSavings,
  validateEmail,
  validatePhone,
  validatePincode,
  sanitizeInput,
  validateProductData,
  truncate,
} from './helpers';

describe('formatCurrency', () => {
  it('should format currency correctly', () => {
    expect(formatCurrency(1000)).toBe('₹1,000');
    expect(formatCurrency(0)).toBe('₹0');
    expect(formatCurrency(null)).toBe('₹0');
    expect(formatCurrency(undefined)).toBe('₹0');
  });
});

describe('validateEmail', () => {
  it('should validate email correctly', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
  });
});

describe('validatePhone', () => {
  it('should validate Indian phone numbers', () => {
    expect(validatePhone('9876543210')).toBe(true);
    expect(validatePhone('8876543210')).toBe(true);
    expect(validatePhone('1234567890')).toBe(false);
    expect(validatePhone('987654')).toBe(false);
  });
});

describe('validatePincode', () => {
  it('should validate Indian pincodes', () => {
    expect(validatePincode('400001')).toBe(true);
    expect(validatePincode('110001')).toBe(true);
    expect(validatePincode('000000')).toBe(false);
    expect(validatePincode('12345')).toBe(false);
  });
});

describe('calculateDistance', () => {
  it('should calculate distance between coordinates', () => {
    const dist = calculateDistance(19.0760, 72.8777, 28.7041, 77.1025);
    expect(dist).toBeGreaterThan(1000);
  });
});

describe('calculateSavings', () => {
  it('should calculate savings correctly', () => {
    const result = calculateSavings(100, 80);
    expect(result.savings).toBe(20);
    expect(result.percentage).toBe(20);
  });
});

describe('sanitizeInput', () => {
  it('should sanitize input correctly', () => {
    expect(sanitizeInput('  test  ')).toBe('test');
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    expect(sanitizeInput('hello world', 5)).toBe('hello');
  });
});

describe('validateProductData', () => {
  it('should validate product data correctly', () => {
    const validProduct = {
      name: 'Test Product',
      groupPrice: 80,
      retailPrice: 100,
      minQuantity: 10,
    };
    
    const result = validateProductData(validProduct);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return errors for invalid product', () => {
    const invalidProduct = {
      name: 'Te',
      groupPrice: 100,
      retailPrice: 80,
      minQuantity: 0,
    };
    
    const result = validateProductData(invalidProduct);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('truncate', () => {
  it('should truncate text correctly', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
    expect(truncate('Hi', 10)).toBe('Hi');
    expect(truncate('', 10)).toBe('');
  });
});
