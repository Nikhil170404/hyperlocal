// src/components/RazorpayButton.jsx - Reusable Razorpay Payment Button
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCardIcon } from '@heroicons/react/24/outline';
import { paymentService } from '../services/paymentService';
import toast from 'react-hot-toast';

export default function RazorpayButton({ 
  orderData, 
  amount, 
  onSuccess, 
  onFailure,
  buttonText = 'Pay Now',
  className = '',
  disabled = false 
}) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePayment = async () => {
    if (!orderData || !amount) {
      toast.error('Invalid payment details');
      return;
    }

    setLoading(true);
    
    try {
      const paymentData = {
        ...orderData,
        amount: amount
      };

      const result = await paymentService.initiatePayment(paymentData);

      if (result.success) {
        // Payment initiated successfully
        // The actual success handling is done in the Razorpay callback
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        // Payment initiation failed
        if (onFailure) {
          onFailure(result.error);
        }
        toast.error('Failed to initiate payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      if (onFailure) {
        onFailure(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          <span>Processing...</span>
        </>
      ) : (
        <>
          <CreditCardIcon className="h-5 w-5" />
          <span>{buttonText} - ₹{amount?.toLocaleString()}</span>
        </>
      )}
    </button>
  );
}

// Mobile-responsive version
export function RazorpayButtonMobile({ 
  orderData, 
  amount, 
  onSuccess, 
  onFailure,
  buttonText = 'Pay Now',
  disabled = false 
}) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!orderData || !amount) {
      toast.error('Invalid payment details');
      return;
    }

    setLoading(true);
    
    try {
      const paymentData = {
        ...orderData,
        amount: amount
      };

      const result = await paymentService.initiatePayment(paymentData);

      if (result.success && onSuccess) {
        onSuccess(result);
      } else if (!result.success && onFailure) {
        onFailure(result.error);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      if (onFailure) {
        onFailure(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || loading}
      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
    >
      {loading ? (
        <>
          <div className="h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          <span>Processing...</span>
        </>
      ) : (
        <>
          <CreditCardIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>{buttonText} - ₹{amount?.toLocaleString()}</span>
        </>
      )}
    </button>
  );
}