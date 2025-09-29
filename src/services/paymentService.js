// src/services/paymentService.js - COMPLETE FIXED VERSION
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { RAZORPAY_CONFIG, loadRazorpayScript } from '../config/razorpay';
import toast from 'react-hot-toast';

export const paymentService = {
  // Initialize Razorpay payment - COMPLETELY FIXED
  async initiatePayment(orderData) {
    try {
      console.log('🚀 Initiating payment for:', orderData);
      
      // Validate required fields
      if (!orderData.orderId || !orderData.amount || !orderData.userName || !orderData.userEmail) {
        throw new Error('Missing required payment data');
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
      
      console.log('💳 Creating payment with amount:', amountInPaise);

      // Save payment intent to Firestore
      const paymentIntentRef = await addDoc(collection(db, 'paymentIntents'), {
        orderId: orderData.orderId,
        groupOrderId: orderData.groupOrderId,
        userId: orderData.userId,
        amount: orderData.amount,
        amountInPaise: amountInPaise,
        currency: 'INR',
        receipt: receipt,
        status: 'created',
        userName: orderData.userName,
        userEmail: orderData.userEmail,
        userPhone: orderData.userPhone,
        createdAt: serverTimestamp()
      });

      console.log('✅ Payment intent created:', paymentIntentRef.id);

      // Razorpay options - FIXED
      const options = {
        key: RAZORPAY_CONFIG.KEY_ID,
        amount: amountInPaise,
        currency: 'INR',
        name: 'GroupBuy',
        description: `Order #${orderData.orderId.slice(-8)}`,
        image: '/logo.png',
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
          groupOrderId: orderData.groupOrderId,
          userId: orderData.userId,
          intentId: paymentIntentRef.id
        },
        theme: {
          color: '#16a34a'
        },
        modal: {
          ondismiss: () => {
            console.log('❌ Payment dismissed');
            toast('Payment cancelled', { icon: '❌' });
            this.handlePaymentDismiss(orderData, paymentIntentRef.id);
          },
          escape: true,
          confirm_close: false
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

      return { success: true };
    } catch (error) {
      console.error('❌ Payment initiation error:', error);
      toast.error(error.message || 'Failed to start payment');
      return { success: false, error: error.message };
    }
  },

  // Handle successful payment - COMPLETELY FIXED
  async handlePaymentSuccess(response, orderData, intentId) {
    try {
      console.log('💰 Processing payment success');
      
      // Update payment intent
      await updateDoc(doc(db, 'paymentIntents', intentId), {
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        status: 'success',
        completedAt: serverTimestamp()
      });

      // Create payment record
      const paymentRef = await addDoc(collection(db, 'payments'), {
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        orderId: orderData.orderId,
        groupOrderId: orderData.groupOrderId,
        userId: orderData.userId,
        amount: orderData.amount,
        intentId: intentId,
        status: 'success',
        createdAt: serverTimestamp()
      });

      console.log('✅ Payment record saved:', paymentRef.id);

      // Update individual order status
      const orderRef = doc(db, 'orders', orderData.orderId);
      await updateDoc(orderRef, {
        paymentStatus: 'paid',
        paymentId: paymentRef.id,
        razorpayPaymentId: response.razorpay_payment_id,
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Order payment status updated');

      // Update group order participant status
      await this.updateGroupOrderPaymentStatus(
        orderData.groupOrderId,
        orderData.userId,
        orderData.orderId,
        'paid'
      );

      console.log('✅ Group order updated');

      // Show success message
      toast.success('Payment successful! 🎉', {
        duration: 5000,
        icon: '💰'
      });

      // Redirect to order details
      setTimeout(() => {
        window.location.href = `/orders/${orderData.groupOrderId}`;
      }, 2000);

      return { success: true };
    } catch (error) {
      console.error('❌ Error processing payment success:', error);
      toast.error('Payment completed but verification failed. Please contact support.');
      return { success: false, error: error.message };
    }
  },

  // Update group order payment status - NEW FUNCTION
  async updateGroupOrderPaymentStatus(groupOrderId, userId, orderId, status) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) {
        console.log('⚠️ Group order not found:', groupOrderId);
        return;
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

      // Update group order
      await updateDoc(groupOrderRef, {
        participants: updatedParticipants,
        updatedAt: serverTimestamp()
      });

      // Check if all participants paid
      const allPaid = updatedParticipants.every(p => p.paymentStatus === 'paid');
      const hasPaidParticipants = updatedParticipants.some(p => p.paymentStatus === 'paid');

      if (allPaid && updatedParticipants.length > 0) {
        await updateDoc(groupOrderRef, {
          status: 'confirmed',
          confirmedAt: serverTimestamp()
        });
        console.log('🎉 All participants paid! Order confirmed');
      } else if (hasPaidParticipants) {
        await updateDoc(groupOrderRef, {
          status: 'active'
        });
        console.log('✅ Order is now active with partial payments');
      }

      return true;
    } catch (error) {
      console.error('❌ Error updating group order payment:', error);
      throw error;
    }
  },

  // Handle payment failure - FIXED
  async handlePaymentFailure(error, orderData, intentId) {
    try {
      console.error('❌ Payment failed:', error);
      
      // Update payment intent
      if (intentId) {
        await updateDoc(doc(db, 'paymentIntents', intentId), {
          status: 'failed',
          errorCode: error.code,
          errorDescription: error.description,
          errorReason: error.reason,
          failedAt: serverTimestamp()
        });
      }

      // Log failure
      await addDoc(collection(db, 'paymentFailures'), {
        orderId: orderData.orderId,
        groupOrderId: orderData.groupOrderId,
        userId: orderData.userId,
        amount: orderData.amount,
        intentId: intentId,
        errorCode: error.code,
        errorDescription: error.description,
        errorReason: error.reason,
        createdAt: serverTimestamp()
      });

      // Show error message
      const errorMsg = error.description || error.reason || 'Payment failed';
      toast.error(errorMsg, { duration: 5000 });

      return { success: false, error: errorMsg };
    } catch (err) {
      console.error('Error logging payment failure:', err);
      return { success: false, error: err.message };
    }
  },

  // Handle payment dismiss - NEW FUNCTION
  async handlePaymentDismiss(orderData, intentId) {
    try {
      if (intentId) {
        await updateDoc(doc(db, 'paymentIntents', intentId), {
          status: 'cancelled',
          cancelledAt: serverTimestamp()
        });
      }
      console.log('Payment cancelled by user');
    } catch (error) {
      console.error('Error handling payment dismiss:', error);
    }
  },

  // Get payment status - NEW FUNCTION
  async getPaymentStatus(orderId) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        return {
          success: true,
          paymentStatus: orderData.paymentStatus,
          paymentId: orderData.paymentId,
          paidAt: orderData.paidAt
        };
      }
      
      return { success: false, error: 'Order not found' };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return { success: false, error: error.message };
    }
  }
};

export default paymentService;