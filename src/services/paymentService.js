// src/services/paymentService.js - Payment Service with Razorpay Integration
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
  // Initialize Razorpay payment
  async initiatePayment(orderData) {
    try {
      // Load Razorpay script
      const res = await loadRazorpayScript();
      
      if (!res) {
        toast.error('Failed to load payment gateway. Please try again.');
        return { success: false, error: 'Script load failed' };
      }

      // Create order in database first
      const razorpayOrder = await this.createRazorpayOrder(orderData);
      
      if (!razorpayOrder.success) {
        toast.error('Failed to create payment order');
        return razorpayOrder;
      }

      // Razorpay payment options
      const options = {
        key: RAZORPAY_CONFIG.KEY_ID,
        amount: razorpayOrder.amount, // Amount in paise
        currency: razorpayOrder.currency,
        name: RAZORPAY_CONFIG.OPTIONS.name,
        description: RAZORPAY_CONFIG.OPTIONS.description,
        image: RAZORPAY_CONFIG.OPTIONS.image,
        order_id: razorpayOrder.id,
        handler: async (response) => {
          // Payment successful
          await this.handlePaymentSuccess(response, orderData);
        },
        prefill: {
          name: orderData.userName,
          email: orderData.userEmail,
          contact: orderData.userPhone
        },
        notes: {
          orderId: orderData.orderId,
          groupId: orderData.groupId,
          userId: orderData.userId
        },
        theme: RAZORPAY_CONFIG.OPTIONS.theme,
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled');
          }
        }
      };

      // Open Razorpay checkout
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

      return { success: true };
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error('Payment failed. Please try again.');
      return { success: false, error: error.message };
    }
  },

  // Create Razorpay order (store in Firestore)
  async createRazorpayOrder(orderData) {
    try {
      const amountInPaise = Math.round(orderData.amount * 100);
      
      // In production, this should be done via Firebase Cloud Function
      // For now, we'll create a pseudo-order in Firestore
      const orderRef = await addDoc(collection(db, 'razorpayOrders'), {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `order_${Date.now()}`,
        notes: {
          orderId: orderData.orderId,
          groupId: orderData.groupId,
          userId: orderData.userId
        },
        status: 'created',
        createdAt: serverTimestamp()
      });

      return {
        success: true,
        id: `order_${orderRef.id}`,
        amount: amountInPaise,
        currency: 'INR'
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      return { success: false, error: error.message };
    }
  },

  // Handle successful payment
  async handlePaymentSuccess(response, orderData) {
    try {
      // Save payment details to Firestore
      const paymentRef = await addDoc(collection(db, 'payments'), {
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        orderId: orderData.orderId,
        groupOrderId: orderData.groupOrderId,
        userId: orderData.userId,
        amount: orderData.amount,
        status: 'success',
        createdAt: serverTimestamp()
      });

      // Update order payment status
      const orderRef = doc(db, 'orders', orderData.orderId);
      await updateDoc(orderRef, {
        paymentStatus: 'paid',
        paymentId: paymentRef.id,
        razorpayPaymentId: response.razorpay_payment_id,
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update participant payment status in group order
      await this.updateParticipantPaymentStatus(
        orderData.groupOrderId,
        orderData.userId,
        'paid'
      );

      toast.success('Payment successful! 🎉', {
        duration: 5000,
        icon: '💰'
      });

      return { success: true, paymentId: paymentRef.id };
    } catch (error) {
      console.error('Error handling payment success:', error);
      toast.error('Payment verification failed');
      return { success: false, error: error.message };
    }
  },

  // Update participant payment status in group order
  async updateParticipantPaymentStatus(groupOrderId, userId, status) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) return;

      const groupOrderData = groupOrderDoc.data();
      const updatedParticipants = groupOrderData.participants.map(p =>
        p.userId === userId ? { ...p, paymentStatus: status, paidAt: serverTimestamp() } : p
      );

      await updateDoc(groupOrderRef, {
        participants: updatedParticipants,
        updatedAt: serverTimestamp()
      });

      // Check if all participants have paid
      const allPaid = updatedParticipants.every(p => p.paymentStatus === 'paid');
      if (allPaid) {
        await updateDoc(groupOrderRef, {
          status: 'confirmed',
          confirmedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating participant payment:', error);
    }
  },

  // Handle payment failure
  async handlePaymentFailure(error, orderData) {
    try {
      // Log payment failure
      await addDoc(collection(db, 'paymentFailures'), {
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        error: error.message || 'Payment failed',
        createdAt: serverTimestamp()
      });

      toast.error('Payment failed. Please try again.');
      return { success: false, error: error.message };
    } catch (err) {
      console.error('Error handling payment failure:', err);
      return { success: false, error: err.message };
    }
  },

  // Get payment details
  async getPaymentDetails(paymentId) {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (paymentDoc.exists()) {
        return { success: true, data: paymentDoc.data() };
      }
      
      return { success: false, error: 'Payment not found' };
    } catch (error) {
      console.error('Error fetching payment details:', error);
      return { success: false, error: error.message };
    }
  },

  // Verify payment (should be done on server-side)
  async verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      // In production, call Firebase Cloud Function to verify
      // For now, just mark as verified
      return { success: true, verified: true };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return { success: false, error: error.message };
    }
  }
};

export default paymentService;