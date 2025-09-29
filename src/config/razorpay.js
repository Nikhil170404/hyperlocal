// src/config/razorpay.js - Razorpay Configuration

// IMPORTANT: Replace these with your actual Razorpay keys
// Get these from: https://dashboard.razorpay.com/app/keys

export const RAZORPAY_CONFIG = {
  // Use Test Key for development, Live Key for production
  KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',
  KEY_SECRET: import.meta.env.VITE_RAZORPAY_KEY_SECRET || 'YOUR_KEY_SECRET', // NEVER expose in frontend
  
  // Payment options
  OPTIONS: {
    currency: 'INR',
    name: 'GroupBuy',
    description: 'Group Buying Order Payment',
    image: '/logo.png', // Your logo URL
    theme: {
      color: '#16a34a' // Your brand color (green-600)
    }
  }
};

// Load Razorpay script
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Verify payment signature (should be done on server-side for security)
export const verifyPaymentSignature = (orderId, paymentId, signature, secret) => {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expectedSignature === signature;
};