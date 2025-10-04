// src/config/razorpay.js - UPDATED TO USE ENVIRONMENT VARIABLES

/**
 * Razorpay Configuration from Environment Variables
 * 
 * IMPORTANT NOTES:
 * 1. Never expose KEY_SECRET in production client-side code
 * 2. For production, implement server-side order creation
 * 3. Use environment variables for sensitive data
 */

// Get configuration from environment variables
const KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;
const KEY_SECRET = import.meta.env.RAZORPAY_KEY_SECRET; // Backend only!

// Validate Razorpay Key ID
if (!KEY_ID) {
  console.error('❌ Missing VITE_RAZORPAY_KEY_ID in environment variables');
  throw new Error('Razorpay configuration missing. Please add VITE_RAZORPAY_KEY_ID to .env file');
}

// Warn if KEY_SECRET is exposed (security issue)
if (KEY_SECRET && import.meta.env.PROD) {
  console.warn('⚠️ WARNING: RAZORPAY_KEY_SECRET should NEVER be in client-side code in production!');
}

// Log configuration status (only in development)
if (import.meta.env.DEV) {
  console.log('💳 Razorpay configuration loaded from environment variables');
  console.log('✅ Key ID:', KEY_ID?.substring(0, 15) + '...');
  console.log('⚠️ Environment:', import.meta.env.MODE);
}

export const RAZORPAY_CONFIG = {
  // Public key - safe to expose in frontend
  KEY_ID: KEY_ID,
  
  // SECURITY WARNING: Never expose KEY_SECRET in client-side code
  // This is only for development/testing
  // In production, keep this server-side only
  KEY_SECRET: KEY_SECRET,
  
  // Payment options
  OPTIONS: {
    currency: 'INR',
    name: import.meta.env.VITE_APP_NAME || 'GroupBuy',
    description: 'Group Buying Order Payment',
    theme: {
      color: '#16a34a', // Green-600
      backdrop_color: 'rgba(0, 0, 0, 0.5)',
      hide_topbar: false
    },
    modal: {
      backdropclose: false,
      escape: true,
      handleback: true,
      confirm_close: false,
      ondismiss: null,
      animation: true
    },
    retry: {
      enabled: true,
      max_count: 3
    },
    timeout: 900, // 15 minutes
    remember_customer: false,
    readonly: {
      contact: false,
      email: false,
      name: false
    },
    hidden: {
      contact: false,
      email: false
    },
    send_sms_hash: true,
    allow_rotation: true,
    device_id: undefined
  }
};

/**
 * Load Razorpay checkout script
 * @returns {Promise<boolean>} True if loaded successfully
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (window.Razorpay) {
      console.log('✅ Razorpay already loaded');
      resolve(true);
      return;
    }

    // Check if script tag exists
    const existingScript = document.getElementById('razorpay-checkout-js');
    if (existingScript) {
      existingScript.onload = () => {
        console.log('✅ Razorpay script loaded');
        resolve(true);
      };
      existingScript.onerror = () => {
        console.error('❌ Failed to load Razorpay script');
        resolve(false);
      };
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ Razorpay script loaded successfully');
      resolve(true);
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load Razorpay script');
      resolve(false);
    };
    
    document.body.appendChild(script);
  });
};

/**
 * Remove Razorpay script (cleanup)
 */
export const unloadRazorpayScript = () => {
  const script = document.getElementById('razorpay-checkout-js');
  if (script) {
    script.remove();
    console.log('🗑️ Razorpay script removed');
  }
  if (window.Razorpay) {
    delete window.Razorpay;
  }
};

/**
 * Razorpay Error Codes Reference
 */
export const RAZORPAY_ERROR_CODES = {
  BAD_REQUEST_ERROR: 'Invalid request parameters',
  GATEWAY_ERROR: 'Payment gateway error',
  SERVER_ERROR: 'Server error occurred',
  NETWORK_ERROR: 'Network connection error',
  AUTHENTICATION_ERROR: 'Authentication failed',
  PAYMENT_DECLINED: 'Payment declined',
  CARD_DECLINED: 'Card declined',
  INSUFFICIENT_FUNDS: 'Insufficient funds',
  INVALID_CARD: 'Invalid card details',
  EXPIRED_CARD: 'Card has expired',
  INVALID_CVV: 'Invalid CVV',
  INCORRECT_PIN: 'Incorrect PIN entered',
  EXCEEDS_WITHDRAWAL_LIMIT: 'Exceeds withdrawal limit',
  TRANSACTION_NOT_PERMITTED: 'Transaction not permitted',
  DO_NOT_HONOR: 'Do not honor',
  RISK_THRESHOLD_EXCEEDED: 'Risk threshold exceeded',
  SUSPECTED_FRAUD: 'Suspected fraud',
  INVALID_ACCOUNT: 'Invalid account',
  CUSTOMER_CANCELLED: 'Customer cancelled',
  TIMEOUT: 'Payment timeout'
};

/**
 * Payment Methods supported by Razorpay
 */
export const PAYMENT_METHODS = {
  CARD: 'card',
  NETBANKING: 'netbanking',
  WALLET: 'wallet',
  UPI: 'upi',
  EMI: 'emi',
  CARDLESS_EMI: 'cardless_emi',
  PAYLATER: 'paylater',
  BANK_TRANSFER: 'bank_transfer'
};

/**
 * Get Razorpay checkout options
 * @param {Object} customOptions - Custom options to merge
 * @returns {Object} Complete checkout options
 */
export const getRazorpayOptions = (customOptions = {}) => {
  return {
    ...RAZORPAY_CONFIG.OPTIONS,
    ...customOptions,
    key: RAZORPAY_CONFIG.KEY_ID,
    theme: {
      ...RAZORPAY_CONFIG.OPTIONS.theme,
      ...(customOptions.theme || {})
    },
    modal: {
      ...RAZORPAY_CONFIG.OPTIONS.modal,
      ...(customOptions.modal || {})
    },
    retry: {
      ...RAZORPAY_CONFIG.OPTIONS.retry,
      ...(customOptions.retry || {})
    }
  };
};

/**
 * Format amount for Razorpay (convert to paise)
 * @param {number} amountInRupees - Amount in rupees
 * @returns {number} Amount in paise
 */
export const formatAmountForRazorpay = (amountInRupees) => {
  return Math.round(amountInRupees * 100);
};

/**
 * Format amount from Razorpay (convert to rupees)
 * @param {number} amountInPaise - Amount in paise
 * @returns {number} Amount in rupees
 */
export const formatAmountFromRazorpay = (amountInPaise) => {
  return amountInPaise / 100;
};

/**
 * Validate Razorpay payment response
 * @param {Object} response - Razorpay payment response
 * @returns {boolean} True if valid
 */
export const validateRazorpayResponse = (response) => {
  if (!response) return false;
  
  // Basic validation
  if (!response.razorpay_payment_id) {
    console.error('Missing razorpay_payment_id');
    return false;
  }
  
  return true;
};

export default {
  RAZORPAY_CONFIG,
  loadRazorpayScript,
  unloadRazorpayScript,
  RAZORPAY_ERROR_CODES,
  PAYMENT_METHODS,
  getRazorpayOptions,
  formatAmountForRazorpay,
  formatAmountFromRazorpay,
  validateRazorpayResponse
};