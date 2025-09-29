// src/config/razorpay.js - Razorpay Configuration - UPDATED

// IMPORTANT: Replace these with your actual Razorpay keys
// Get these from: https://dashboard.razorpay.com/app/keys

export const RAZORPAY_CONFIG = {
  // Your test credentials
  KEY_ID: 'rzp_test_RNTPHWzRLB1xYG',
  KEY_SECRET: 'M7vID0ilFMnZFWrKrXOyVPW7', // Note: Never expose in production
  
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