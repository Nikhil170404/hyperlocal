// src/services/paymentService.js - COMPLETELY FIXED & OPTIMIZED
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { RAZORPAY_CONFIG, loadRazorpayScript } from '../config/razorpay';
import toast from 'react-hot-toast';

export const paymentService = {
  /**
   * Initialize and process Razorpay payment
   * @param {Object} orderData - Order and payment data
   * @returns {Promise<Object>} Payment result
   */
  async initiatePayment(orderData) {
    try {
      console.log('🚀 Initiating payment for:', {
        orderId: orderData.orderId,
        amount: orderData.amount,
        user: orderData.userName
      });
      
      // Validate required fields
      const requiredFields = ['orderId', 'amount', 'userName', 'userEmail', 'userId'];
      for (const field of requiredFields) {
        if (!orderData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate amount
      if (orderData.amount <= 0) {
        throw new Error('Invalid amount');
      }

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay. Please check your internet connection.');
      }

      console.log('✅ Razorpay script loaded');

      // Calculate amount in paise
      const amountInPaise = Math.round(orderData.amount * 100);
      
      // Generate unique receipt ID
      const receipt = `rcpt_${Date.now()}_${orderData.orderId.slice(-8)}`;
      
      console.log('💳 Creating payment intent with amount:', amountInPaise);

      // Create payment intent in Firestore
      const paymentIntentRef = await addDoc(collection(db, 'paymentIntents'), {
        orderId: orderData.orderId,
        groupOrderId: orderData.groupOrderId || null,
        groupId: orderData.groupId || null,
        userId: orderData.userId,
        amount: orderData.amount,
        amountInPaise: amountInPaise,
        currency: 'INR',
        receipt: receipt,
        status: 'created',
        userName: orderData.userName,
        userEmail: orderData.userEmail,
        userPhone: orderData.userPhone || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Payment intent created:', paymentIntentRef.id);

      // Razorpay checkout options
      const options = {
        key: RAZORPAY_CONFIG.KEY_ID,
        amount: amountInPaise,
        currency: 'INR',
        name: 'GroupBuy',
        description: `Order Payment`,
        // Remove image or use absolute URL
        // image: window.location.origin + '/logo.png',
        handler: async (response) => {
          console.log('✅ Payment successful:', response);
          await this.handlePaymentSuccess(response, orderData, paymentIntentRef.id);
        },
        prefill: {
          name: orderData.userName,
          email: orderData.userEmail,
          contact: orderData.userPhone || ''
        },
        notes: {
          orderId: orderData.orderId,
          groupOrderId: orderData.groupOrderId || '',
          userId: orderData.userId,
          intentId: paymentIntentRef.id
        },
        theme: {
          color: '#16a34a',
          backdrop_color: 'rgba(0, 0, 0, 0.5)'
        },
        modal: {
          ondismiss: () => {
            console.log('❌ Payment dismissed by user');
            this.handlePaymentDismiss(orderData, paymentIntentRef.id);
          },
          escape: true,
          confirm_close: false,
          animation: true
        },
        retry: {
          enabled: true,
          max_count: 3
        }
      };

      console.log('🔧 Opening Razorpay checkout');

      // Create Razorpay instance
      const paymentObject = new window.Razorpay(options);
      
      // Handle payment failure
      paymentObject.on('payment.failed', async (response) => {
        console.error('❌ Payment failed:', response.error);
        await this.handlePaymentFailure(response.error, orderData, paymentIntentRef.id);
      });

      // Open checkout
      paymentObject.open();

      return { 
        success: true,
        intentId: paymentIntentRef.id 
      };

    } catch (error) {
      console.error('❌ Payment initiation error:', error);
      toast.error(error.message || 'Failed to start payment');
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  /**
   * Handle successful payment
   * @param {Object} response - Razorpay response
   * @param {Object} orderData - Order data
   * @param {string} intentId - Payment intent ID
   */
  async handlePaymentSuccess(response, orderData, intentId) {
    try {
      console.log('💰 Processing payment success');
      
      // Use Firestore transaction for atomic updates
      await runTransaction(db, async (transaction) => {
        // 1. Update payment intent
        const intentRef = doc(db, 'paymentIntents', intentId);
        transaction.update(intentRef, {
          razorpayPaymentId: response.razorpay_payment_id || null,
          // Only include signature if it exists (for order verification)
          ...(response.razorpay_signature && { 
            razorpaySignature: response.razorpay_signature 
          }),
          status: 'success',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // 2. Create payment record
        const paymentRef = doc(collection(db, 'payments'));
        transaction.set(paymentRef, {
          razorpayPaymentId: response.razorpay_payment_id || null,
          ...(response.razorpay_signature && { 
            razorpaySignature: response.razorpay_signature 
          }),
          orderId: orderData.orderId,
          groupOrderId: orderData.groupOrderId || null,
          userId: orderData.userId,
          amount: orderData.amount,
          intentId: intentId,
          status: 'success',
          method: 'razorpay',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // 3. Update individual order status
        const orderRef = doc(db, 'orders', orderData.orderId);
        transaction.update(orderRef, {
          paymentStatus: 'paid',
          paymentId: paymentRef.id,
          razorpayPaymentId: response.razorpay_payment_id || null,
          paidAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      console.log('✅ Payment transaction completed');

      // 4. Update group order (outside transaction for flexibility)
      if (orderData.groupOrderId) {
        await this.updateGroupOrderPaymentStatus(
          orderData.groupOrderId,
          orderData.userId,
          orderData.orderId,
          'paid'
        );
      }

      // Show success message
      toast.success('Payment successful! 🎉', {
        duration: 5000,
        icon: '💰',
        style: {
          background: '#10b981',
          color: '#fff',
        }
      });

      // Redirect after delay
      setTimeout(() => {
        if (orderData.groupOrderId) {
          window.location.href = `/orders/${orderData.groupOrderId}`;
        } else {
          window.location.href = '/orders';
        }
      }, 2000);

      return { success: true };

    } catch (error) {
      console.error('❌ Error processing payment success:', error);
      
      // Try to update status anyway
      try {
        await updateDoc(doc(db, 'paymentIntents', intentId), {
          status: 'success_but_update_failed',
          error: error.message,
          updatedAt: serverTimestamp()
        });
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }

      toast.error('Payment completed but verification failed. Please contact support with Order ID: ' + orderData.orderId, {
        duration: 10000
      });

      return { success: false, error: error.message };
    }
  },

  /**
   * Update group order participant payment status
   * @param {string} groupOrderId - Group order ID
   * @param {string} userId - User ID
   * @param {string} orderId - Individual order ID
   * @param {string} status - Payment status
   */
  async updateGroupOrderPaymentStatus(groupOrderId, userId, orderId, status) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) {
        console.log('⚠️ Group order not found:', groupOrderId);
        return false;
      }

      const groupOrderData = groupOrderDoc.data();
      const participants = groupOrderData.participants || [];
      
      // Update participant payment status
      const updatedParticipants = participants.map(p => {
        if (p.userId === userId || p.orderId === orderId) {
          return {
            ...p,
            paymentStatus: status,
            paidAt: status === 'paid' ? Date.now() : null
          };
        }
        return p;
      });

      // Check payment completion
      const totalParticipants = updatedParticipants.length;
      const paidCount = updatedParticipants.filter(p => p.paymentStatus === 'paid').length;
      const allPaid = paidCount === totalParticipants && totalParticipants > 0;

      // Determine new status
      let newStatus = groupOrderData.status;
      if (allPaid) {
        newStatus = 'confirmed';
      } else if (paidCount > 0) {
        newStatus = 'active';
      }

      // Update group order
      await updateDoc(groupOrderRef, {
        participants: updatedParticipants,
        status: newStatus,
        ...(allPaid && { confirmedAt: serverTimestamp() }),
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Group order updated: ${paidCount}/${totalParticipants} paid, status: ${newStatus}`);

      return true;

    } catch (error) {
      console.error('❌ Error updating group order payment:', error);
      // Don't throw - this is a non-critical update
      return false;
    }
  },

  /**
   * Handle payment failure
   * @param {Object} error - Razorpay error
   * @param {Object} orderData - Order data
   * @param {string} intentId - Payment intent ID
   */
  async handlePaymentFailure(error, orderData, intentId) {
    try {
      console.error('❌ Payment failed:', error);
      
      // Update payment intent
      if (intentId) {
        await updateDoc(doc(db, 'paymentIntents', intentId), {
          status: 'failed',
          errorCode: error.code || 'UNKNOWN',
          errorDescription: error.description || 'Payment failed',
          errorReason: error.reason || 'Unknown reason',
          errorStep: error.step || null,
          errorSource: error.source || null,
          failedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Log failure for analytics
      await addDoc(collection(db, 'paymentFailures'), {
        orderId: orderData.orderId,
        groupOrderId: orderData.groupOrderId || null,
        userId: orderData.userId,
        amount: orderData.amount,
        intentId: intentId,
        errorCode: error.code || 'UNKNOWN',
        errorDescription: error.description || 'Payment failed',
        errorReason: error.reason || 'Unknown reason',
        errorStep: error.step || null,
        createdAt: serverTimestamp()
      });

      // Show user-friendly error message
      const errorMsg = this.getUserFriendlyErrorMessage(error);
      toast.error(errorMsg, { 
        duration: 7000,
        style: {
          background: '#ef4444',
          color: '#fff',
        }
      });

      return { success: false, error: errorMsg };

    } catch (err) {
      console.error('Error logging payment failure:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Handle payment modal dismiss
   * @param {Object} orderData - Order data
   * @param {string} intentId - Payment intent ID
   */
  async handlePaymentDismiss(orderData, intentId) {
    try {
      if (intentId) {
        await updateDoc(doc(db, 'paymentIntents', intentId), {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      toast('Payment cancelled', { 
        icon: '❌',
        duration: 3000 
      });

      console.log('Payment cancelled by user');

    } catch (error) {
      console.error('Error handling payment dismiss:', error);
    }
  },

  /**
   * Get user-friendly error message
   * @param {Object} error - Razorpay error
   * @returns {string} User-friendly message
   */
  getUserFriendlyErrorMessage(error) {
    const errorCode = error.code || '';
    const errorMessages = {
      'BAD_REQUEST_ERROR': 'Invalid payment request. Please try again.',
      'GATEWAY_ERROR': 'Payment gateway error. Please try again.',
      'SERVER_ERROR': 'Server error. Please try again later.',
      'NETWORK_ERROR': 'Network error. Please check your connection.',
      'AUTHENTICATION_ERROR': 'Payment authentication failed.',
      'PAYMENT_DECLINED': 'Payment was declined by your bank.',
      'CARD_DECLINED': 'Card was declined. Please try another card.',
      'INSUFFICIENT_FUNDS': 'Insufficient funds in your account.',
      'INVALID_CARD': 'Invalid card details. Please check and try again.',
    };

    return errorMessages[errorCode] || error.description || 'Payment failed. Please try again.';
  },

  /**
   * Get payment status
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(orderId) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        return {
          success: true,
          paymentStatus: orderData.paymentStatus || 'pending',
          paymentId: orderData.paymentId || null,
          razorpayPaymentId: orderData.razorpayPaymentId || null,
          paidAt: orderData.paidAt || null
        };
      }
      
      return { 
        success: false, 
        error: 'Order not found' 
      };

    } catch (error) {
      console.error('Error getting payment status:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  /**
   * Verify payment (for additional security)
   * @param {Object} paymentData - Payment verification data
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(paymentData) {
    try {
      // This would ideally be done server-side with Razorpay webhook
      // For client-side, we just check if payment exists in our database
      const paymentRef = collection(db, 'payments');
      const q = query(paymentRef, 
        where('razorpayPaymentId', '==', paymentData.razorpayPaymentId),
        where('orderId', '==', paymentData.orderId)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return {
          success: true,
          verified: true,
          message: 'Payment verified successfully'
        };
      }
      
      return {
        success: false,
        verified: false,
        message: 'Payment not found'
      };

    } catch (error) {
      console.error('Error verifying payment:', error);
      return {
        success: false,
        verified: false,
        error: error.message
      };
    }
  }
};

export default paymentService;