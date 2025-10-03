// functions/index.js - All Cloud Functions
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Admin SDK
admin.initializeApp();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: functions.config().razorpay?.key_id || process.env.RAZORPAY_KEY_ID,
  key_secret: functions.config().razorpay?.key_secret || process.env.RAZORPAY_KEY_SECRET
});

// ============================================
// RAZORPAY FUNCTIONS
// ============================================

// Create Razorpay Order
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { amount, currency, receipt, notes } = data;

    if (!amount || amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Amount must be greater than 0');
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: currency || 'INR',
      receipt: receipt || `order_${Date.now()}`,
      notes: notes || {}
    };

    const razorpayOrder = await razorpay.orders.create(options);

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
    throw new functions.https.HttpsError('internal', 'Failed to create payment order', error.message);
  }
});

// Verify Razorpay Payment
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    const expectedSignature = crypto
      .createHmac('sha256', functions.config().razorpay.key_secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isValid = expectedSignature === razorpaySignature;

    if (isValid) {
      await admin.firestore().collection('payments').add({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        userId: context.auth.uid,
        status: 'verified',
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, verified: true, message: 'Payment verified successfully' };
    } else {
      await admin.firestore().collection('paymentVerificationFailures').add({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        userId: context.auth.uid,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      throw new functions.https.HttpsError('invalid-argument', 'Payment verification failed');
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw new functions.https.HttpsError('internal', 'Payment verification failed', error.message);
  }
});

// Razorpay Webhook
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  const webhookSignature = req.headers['x-razorpay-signature'];
  const webhookSecret = functions.config().razorpay?.webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (webhookSignature !== expectedSignature) {
    console.error('Invalid webhook signature');
    return res.status(400).send('Invalid signature');
  }

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

async function handlePaymentCaptured(payment) {
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
}

async function handlePaymentFailed(payment) {
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

async function handleOrderPaid(order) {
  await admin.firestore().collection('razorpayOrders').doc(order.id).update({
    status: 'paid',
    paidAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// ============================================
// NOTIFICATION FUNCTIONS (FCM)
// ============================================

// Send notification to single user
exports.sendNotificationToUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, notification } = data;

  if (!userId || !notification) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing userId or notification');
  }

  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken || !userData.notificationsEnabled) {
      return { success: false, reason: 'no_token_or_disabled' };
    }

    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      webpush: {
        notification: {
          icon: '/logo.png',
          badge: '/badge.png'
        }
      }
    };

    const response = await admin.messaging().send(message);
    
    await admin.firestore().collection('notificationLogs').add({
      userId,
      notification,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      messageId: response,
      status: 'sent'
    });

    return { success: true, messageId: response };

  } catch (error) {
    console.error('Error sending notification:', error);
    
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      await admin.firestore().collection('users').doc(userId).update({
        fcmToken: admin.firestore.FieldValue.delete(),
        notificationsEnabled: false
      });
    }

    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Send notification to multiple users
exports.sendNotificationToUsers = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userIds, notification } = data;

  if (!userIds || !Array.isArray(userIds) || !notification) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid parameters');
  }

  try {
    const results = { success: 0, failed: 0, total: userIds.length };
    const batchSize = 500;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const userDocs = await admin.firestore()
        .collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
        .get();

      const tokens = [];
      userDocs.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken && data.notificationsEnabled) {
          tokens.push(data.fcmToken);
        }
      });

      if (tokens.length === 0) continue;

      const message = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {}
      };

      const response = await admin.messaging().sendMulticast(message);
      results.success += response.successCount;
      results.failed += response.failureCount;
    }

    return results;

  } catch (error) {
    console.error('Error sending notifications:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Send notification to group
exports.sendNotificationToGroup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, notification } = data;

  if (!groupId || !notification) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
  }

  try {
    const groupDoc = await admin.firestore().collection('groups').doc(groupId).get();
    
    if (!groupDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Group not found');
    }

    const members = groupDoc.data().members || [];
    return await exports.sendNotificationToUsers({ userIds: members, notification }, context);

  } catch (error) {
    console.error('Error sending group notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// AUTOMATED NOTIFICATION TRIGGERS
// ============================================

// Order placed notification
exports.onOrderPlaced = functions.firestore
  .document('orderCycles/{cycleId}')
  .onCreate(async (snap, context) => {
    const cycleData = snap.data();
    const participants = cycleData.participants || [];

    for (const participant of participants) {
      try {
        await admin.firestore().collection('pendingNotifications').add({
          userId: participant.userId,
          notification: {
            title: '🎉 Order Placed!',
            body: 'Your order has been placed successfully.',
            data: {
              type: 'order',
              orderId: context.params.cycleId,
              url: `/orders/${context.params.cycleId}`
            }
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error(`Failed to queue notification for ${participant.userId}:`, error);
      }
    }
  });

// Payment window notification
exports.onPaymentWindowOpened = functions.firestore
  .document('orderCycles/{cycleId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.phase !== 'payment_window' && after.phase === 'payment_window') {
      const participants = after.participants || [];

      for (const participant of participants) {
        if (participant.paymentStatus !== 'paid') {
          try {
            await admin.firestore().collection('pendingNotifications').add({
              userId: participant.userId,
              notification: {
                title: '⏰ Payment Window Open!',
                body: 'Complete your payment now. Window closes in 4 hours.',
                data: {
                  type: 'payment',
                  orderId: context.params.cycleId,
                  url: `/orders/${context.params.cycleId}`,
                  priority: 'high'
                }
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          } catch (error) {
            console.error(`Failed to queue payment notification for ${participant.userId}:`, error);
          }
        }
      }
    }
  });

// Order confirmed notification
exports.onOrderConfirmed = functions.firestore
  .document('orderCycles/{cycleId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.phase !== 'confirmed' && after.phase === 'confirmed') {
      const participants = after.participants || [];

      for (const participant of participants) {
        try {
          await admin.firestore().collection('pendingNotifications').add({
            userId: participant.userId,
            notification: {
              title: '✅ Order Confirmed!',
              body: 'Your order is confirmed and being processed.',
              data: {
                type: 'order',
                orderId: context.params.cycleId,
                url: `/orders/${context.params.cycleId}`
              }
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } catch (error) {
          console.error(`Failed to queue confirmation for ${participant.userId}:`, error);
        }
      }
    }
  });