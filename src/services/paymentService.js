// src/services/paymentService.js - UPDATED TO USE BACKEND API
import { loadRazorpayScript } from '../config/razorpay';
import toast from 'react-hot-toast';

// Backend API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const paymentService = {
  /**
   * Initiate payment for order cycle
   */
  async initiatePayment(orderData) {
    try {
      console.log('🚀 Initiating payment for cycle:', orderData.orderId);
      
      // Validate
      if (!orderData.orderId || !orderData.amount || !orderData.userId) {
        throw new Error('Missing required payment data');
      }

      if (orderData.amount <= 0) {
        throw new Error('Invalid amount');
      }

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order via backend API
      const orderResponse = await fetch(`${API_URL}/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: orderData.amount,
          currency: 'INR',
          receipt: `order_${orderData.orderId}_${Date.now()}`,
          notes: {
            cycleId: orderData.orderId,
            groupId: orderData.groupId || '',
            userId: orderData.userId,
            userName: orderData.userName
          }
        })
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const { order } = await orderResponse.json();
      console.log('✅ Order created:', order.id);

      // Build Razorpay checkout options
      const checkoutOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'GroupBuy',
        description: `Payment for Order Cycle`,
        order_id: order.id,
        handler: async (response) => {
          await this.handlePaymentSuccess(response, orderData);
        },
        prefill: {
          name: orderData.userName,
          email: orderData.userEmail,
          contact: orderData.userPhone || ''
        },
        theme: {
          color: '#16a34a'
        },
        modal: {
          ondismiss: () => {
            console.log('Payment cancelled by user');
            toast('Payment cancelled', { icon: '❌' });
          },
          escape: true,
          animation: true
        }
      };

      // Open Razorpay checkout
      const paymentObject = new window.Razorpay(checkoutOptions);
      
      paymentObject.on('payment.failed', async (response) => {
        await this.handlePaymentFailure(response.error, orderData);
      });

      paymentObject.open();
      
      return { success: true };

    } catch (error) {
      console.error('❌ Payment error:', error);
      toast.error(error.message || 'Payment failed');
      return { success: false, error: error.message };
    }
  },

  /**
   * Handle payment success
   */
  async handlePaymentSuccess(response, orderData) {
    try {
      console.log('💰 Processing payment success');
      
      // Verify payment with backend
      const verifyResponse = await fetch(`${API_URL}/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          cycleId: orderData.orderId,
          userId: orderData.userId
        })
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || 'Payment verification failed');
      }

      const result = await verifyResponse.json();
      console.log('✅ Payment verified:', result);

      // Show success message
      toast.success('Payment successful! 🎉', {
        duration: 5000,
        icon: '💰'
      });

      // Redirect to group page
      setTimeout(() => {
        window.location.href = `/groups/${orderData.groupId}`;
      }, 2000);

      return { success: true };

    } catch (error) {
      console.error('❌ Error processing payment:', error);
      toast.error('Payment completed but verification failed. Please contact support.', {
        duration: 10000
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(error, orderData) {
    try {
      console.error('❌ Payment failed:', error);
      
      const errorMsg = this.getUserFriendlyErrorMessage(error);
      toast.error(errorMsg, { duration: 7000 });

      return { success: false, error: errorMsg };

    } catch (err) {
      console.error('Error handling failure:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Get user-friendly error message
   */
  getUserFriendlyErrorMessage(error) {
    const errorCode = error.code || error.message || '';
    
    const errorMessages = {
      'BAD_REQUEST_ERROR': 'Invalid payment request',
      'GATEWAY_ERROR': 'Payment gateway error',
      'NETWORK_ERROR': 'Network error. Check your connection',
      'PAYMENT_DECLINED': 'Payment was declined by your bank',
      'CARD_DECLINED': 'Card was declined',
      'INSUFFICIENT_FUNDS': 'Insufficient funds',
      'INVALID_CARD': 'Invalid card details',
      'TIMEOUT': 'Payment timed out'
    };

    return errorMessages[errorCode] || error.description || 'Payment failed. Please try again.';
  },

  /**
   * Initiate refund
   */
  async initiateRefund(paymentId, amount = null, notes = {}) {
    try {
      const response = await fetch(`${API_URL}/payment/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId,
          amount,
          notes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Refund failed');
      }

      const result = await response.json();
      console.log('✅ Refund initiated:', result.refund.id);
      
      toast.success('Refund initiated successfully', { duration: 5000 });
      
      return { success: true, refund: result.refund };

    } catch (error) {
      console.error('❌ Refund error:', error);
      toast.error(error.message || 'Refund failed');
      return { success: false, error: error.message };
    }
  },

  /**
   * Cancel payment (for authorized payments)
   */
  async cancelPayment(paymentId) {
    try {
      const response = await fetch(`${API_URL}/payment/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Cancel failed');
      }

      const result = await response.json();
      console.log('✅ Payment cancelled:', result.payment.id);
      
      toast.success('Payment cancelled successfully');
      
      return { success: true };

    } catch (error) {
      console.error('❌ Cancel error:', error);
      toast.error(error.message || 'Cancel failed');
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch payment details
   */
  async fetchPaymentDetails(paymentId) {
    try {
      const response = await fetch(`${API_URL}/payment/${paymentId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch payment');
      }

      const result = await response.json();
      return { success: true, payment: result.payment };

    } catch (error) {
      console.error('❌ Fetch payment error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch refund status
   */
  async fetchRefundStatus(refundId) {
    try {
      const response = await fetch(`${API_URL}/payment/refund/${refundId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch refund');
      }

      const result = await response.json();
      return { success: true, refund: result.refund };

    } catch (error) {
      console.error('❌ Fetch refund error:', error);
      return { success: false, error: error.message };
    }
  }
};

export default paymentService;