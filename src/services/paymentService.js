// src/services/paymentService.js - UPDATED FOR ORDER CYCLES
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { RAZORPAY_CONFIG, loadRazorpayScript } from '../config/razorpay';
import { orderService } from './groupService';
import toast from 'react-hot-toast';

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
      const scriptLoaded = await this.loadScriptWithRetry();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(orderData);
      
      // Calculate amount in paise
      const amountInPaise = Math.round(orderData.amount * 100);
      
      // Build checkout options
      const checkoutOptions = {
        key: RAZORPAY_CONFIG.KEY_ID,
        amount: amountInPaise,
        currency: 'INR',
        name: 'GroupBuy',
        description: `Payment for Order Cycle`,
        handler: async (response) => {
          await this.handlePaymentSuccess(response, orderData, paymentIntent.id);
        },
        prefill: {
          name: orderData.userName,
          email: orderData.userEmail,
          contact: orderData.userPhone || ''
        },
        notes: {
          cycleId: orderData.orderId,
          userId: orderData.userId,
          intentId: paymentIntent.id
        },
        theme: {
          color: '#16a34a'
        },
        modal: {
          ondismiss: () => {
            this.handlePaymentDismiss(paymentIntent.id);
          },
          escape: true,
          animation: true
        }
      };

      // Open checkout
      const paymentObject = new window.Razorpay(checkoutOptions);
      
      paymentObject.on('payment.failed', async (response) => {
        await this.handlePaymentFailure(response.error, orderData, paymentIntent.id);
      });

      paymentObject.open();
      
      return { success: true, intentId: paymentIntent.id };

    } catch (error) {
      console.error('❌ Payment error:', error);
      toast.error(error.message || 'Payment failed');
      return { success: false, error: error.message };
    }
  },

  /**
   * Load Razorpay script with retry
   */
  async loadScriptWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const loaded = await loadRazorpayScript();
        if (loaded) return true;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      } catch (error) {
        console.error(`Script load attempt ${i + 1} failed`);
      }
    }
    return false;
  },

  /**
   * Create payment intent
   */
  async createPaymentIntent(orderData) {
    const intentRef = await addDoc(collection(db, 'paymentIntents'), {
      cycleId: orderData.orderId,
      groupId: orderData.groupId || null,
      userId: orderData.userId,
      amount: orderData.amount,
      amountInPaise: Math.round(orderData.amount * 100),
      currency: 'INR',
      status: 'created',
      userName: orderData.userName,
      userEmail: orderData.userEmail,
      userPhone: orderData.userPhone || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: intentRef.id };
  },

  /**
   * Handle payment success
   */
  async handlePaymentSuccess(response, orderData, intentId) {
    try {
      console.log('💰 Processing payment success');
      
      const batch = writeBatch(db);

      // 1. Update payment intent
      const intentRef = doc(db, 'paymentIntents', intentId);
      batch.update(intentRef, {
        razorpayPaymentId: response.razorpay_payment_id || null,
        ...(response.razorpay_signature && { 
          razorpaySignature: response.razorpay_signature 
        }),
        status: 'success',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Create payment record
      const paymentRef = doc(collection(db, 'payments'));
      batch.set(paymentRef, {
        razorpayPaymentId: response.razorpay_payment_id || null,
        cycleId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        intentId: intentId,
        status: 'success',
        method: 'razorpay',
        createdAt: serverTimestamp()
      });

      await batch.commit();
      console.log('✅ Payment batch committed');

      // 3. Update order cycle participant status
      await orderService.updatePaymentStatus(
        orderData.orderId,
        orderData.userId,
        'paid'
      );

      // Show success
      toast.success('Payment successful! 🎉', {
        duration: 5000,
        icon: '💰'
      });

      // Redirect
      setTimeout(() => {
        window.location.href = `/groups/${orderData.groupId}`;
      }, 2000);

      return { success: true };

    } catch (error) {
      console.error('❌ Error processing payment:', error);
      
      try {
        await updateDoc(doc(db, 'paymentIntents', intentId), {
          status: 'success_but_update_failed',
          error: error.message,
          updatedAt: serverTimestamp()
        });
      } catch (updateError) {
        console.error('Failed to update error status');
      }

      toast.error('Payment completed but verification failed. Please contact support.', {
        duration: 10000
      });

      return { success: false, error: error.message };
    }
  },

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(error, orderData, intentId) {
    try {
      console.error('❌ Payment failed:', error);
      
      if (intentId) {
        await updateDoc(doc(db, 'paymentIntents', intentId), {
          status: 'failed',
          errorCode: error.code || 'UNKNOWN',
          errorDescription: error.description || 'Payment failed',
          failedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Log failure
      await addDoc(collection(db, 'paymentFailures'), {
        cycleId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        intentId: intentId,
        errorCode: error.code || 'UNKNOWN',
        errorDescription: error.description || 'Payment failed',
        createdAt: serverTimestamp()
      });

      const errorMsg = this.getUserFriendlyErrorMessage(error);
      toast.error(errorMsg, { duration: 7000 });

      return { success: false, error: errorMsg };

    } catch (err) {
      console.error('Error logging failure:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Handle payment dismiss
   */
  async handlePaymentDismiss(intentId) {
    try {
      if (intentId) {
        await updateDoc(doc(db, 'paymentIntents', intentId), {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      toast('Payment cancelled', { icon: '❌', duration: 3000 });
    } catch (error) {
      console.error('Error handling dismiss:', error);
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
  }
};

export default paymentService;