// functions/index.js - Firebase Cloud Functions for Razorpay Integration
// This is for production use - server-side order creation and payment verification

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Razorpay = require('razorpay');
const crypto = require('crypto');

admin.initializeApp();

// Initialize Razorpay with your credentials
const razorpay = new Razorpay({
  key_id: functions.config().razorpay.key_id,
  key_secret: functions.config().razorpay.key_secret
});

// Create Razorpay Order (Server-side)
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to create orders'
    );
  }

  try {
    const { amount, currency, receipt, notes } = data;

    // Validate input
    if (!amount || amount <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Amount must be greater than 0'
      );
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency || 'INR',
      receipt: receipt || `order_${Date.now()}`,
      notes: notes || {}
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Store order details in Firestore
    await admin.firestore().collection('razorpayOrders').doc(razorpayOrder.id).set({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      status: razorpayOrder.status,
      notes: razorpayOrder.notes,
      userId: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create payment order',
      error.message
    );
  }
});

// Verify Razorpay Payment Signature (Server-side)
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

    // Validate input
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required payment verification parameters'
      );
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', functions.config().razorpay.key_secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isValid = expectedSignature === razorpaySignature;

    if (isValid) {
      // Signature is valid - save payment details
      await admin.firestore().collection('payments').add({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        userId: context.auth.uid,
        status: 'verified',
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        verified: true,
        message: 'Payment verified successfully'
      };
    } else {
      // Signature is invalid - log suspicious activity
      await admin.firestore().collection('paymentVerificationFailures').add({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        userId: context.auth.uid,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      throw new functions.https.HttpsError(
        'invalid-argument',
        'Payment verification failed - invalid signature'
      );
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Payment verification failed',
      error.message
    );
  }
});

// Webhook to handle Razorpay events (Production)
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  // Verify webhook signature
  const webhookSignature = req.headers['x-razorpay-signature'];
  const webhookSecret = functions.config().razorpay.webhook_secret;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (webhookSignature !== expectedSignature) {
    console.error('Invalid webhook signature');
    return res.status(400).send('Invalid signature');
  }

  // Process webhook event
  const event = req.body.event;
  const payload = req.body.payload;

  try {
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;
      
      case 'order.paid':
        await handleOrderPaid(payload.order.entity);
        break;
      
      default:
        console.log(`Unhandled event: ${event}`);
    }

    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// Helper function to handle payment captured event
async function handlePaymentCaptured(payment) {
  console.log('Payment captured:', payment.id);
  
  // Update payment record in Firestore
  await admin.firestore().collection('payments').add({
    razorpayPaymentId: payment.id,
    razorpayOrderId: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    status: 'captured',
    capturedAt: admin.firestore.FieldValue.serverTimestamp(),
    webhook: true
  });

  // You can add additional logic here, such as:
  // - Updating order status
  // - Sending confirmation emails
  // - Triggering fulfillment processes
}

// Helper function to handle payment failed event
async function handlePaymentFailed(payment) {
  console.log('Payment failed:', payment.id);
  
  // Log failed payment
  await admin.firestore().collection('paymentFailures').add({
    razorpayPaymentId: payment.id,
    razorpayOrderId: payment.order_id,
    amount: payment.amount,
    errorCode: payment.error_code,
    errorDescription: payment.error_description,
    failedAt: admin.firestore.FieldValue.serverTimestamp(),
    webhook: true
  });
}

// Helper function to handle order paid event
async function handleOrderPaid(order) {
  console.log('Order paid:', order.id);
  
  // Update order status
  await admin.firestore().collection('razorpayOrders').doc(order.id).update({
    status: 'paid',
    paidAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Refund payment (Admin function)
exports.refundPayment = functions.https.onCall(async (data, context) => {
  // Check if user is admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  // Verify admin role
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can process refunds'
    );
  }

  try {
    const { paymentId, amount, reason } = data;

    // Create refund
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
      notes: {
        reason: reason || 'Customer request'
      }
    });

    // Log refund
    await admin.firestore().collection('refunds').add({
      razorpayPaymentId: paymentId,
      razorpayRefundId: refund.id,
      amount: refund.amount,
      status: refund.status,
      processedBy: context.auth.uid,
      reason: reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to process refund',
      error.message
    );
  }
});