// functions/notifications.js - Cloud Functions for FCM Notifications
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// ============================================
// SEND NOTIFICATION TO SINGLE USER
// ============================================
exports.sendNotificationToUser = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { userId, notification } = data;

  if (!userId || !notification) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing userId or notification data'
    );
  }

  try {
    // Get user's FCM token
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
      console.log(`User ${userId} has no FCM token`);
      return { success: false, reason: 'no_token' };
    }

    // Check if user has notifications enabled
    if (!userData.notificationsEnabled) {
      console.log(`User ${userId} has notifications disabled`);
      return { success: false, reason: 'disabled' };
    }

    // Build notification message
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image
      },
      data: notification.data || {},
      android: {
        notification: {
          icon: 'notification_icon',
          color: '#16a34a',
          sound: 'default',
          priority: 'high'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      webpush: {
        notification: {
          icon: '/logo.png',
          badge: '/badge.png',
          requireInteraction: notification.priority === 'high'
        },
        fcmOptions: {
          link: notification.url || '/'
        }
      }
    };

    // Send notification
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully:', response);

    // Log notification
    await admin.firestore().collection('notificationLogs').add({
      userId,
      notification,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      messageId: response,
      status: 'sent'
    });

    return { success: true, messageId: response };

  } catch (error) {
    console.error('❌ Error sending notification:', error);

    // Handle token errors
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      // Remove invalid token
      await admin.firestore().collection('users').doc(userId).update({
        fcmToken: admin.firestore.FieldValue.delete(),
        notificationsEnabled: false
      });
    }

    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// SEND NOTIFICATION TO MULTIPLE USERS
// ============================================
exports.sendNotificationToUsers = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { userIds, notification } = data;

  if (!userIds || !Array.isArray(userIds) || !notification) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid userIds or notification data'
    );
  }

  try {
    const results = {
      success: 0,
      failed: 0,
      total: userIds.length
    };

    // Process in batches of 500 (FCM limit)
    const batchSize = 500;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      // Get FCM tokens for this batch
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

      // Build multicast message
      const message = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          notification: {
            icon: 'notification_icon',
            color: '#16a34a',
            sound: 'default'
          }
        },
        webpush: {
          notification: {
            icon: '/logo.png'
          }
        }
      };

      // Send to batch
      const response = await admin.messaging().sendMulticast(message);
      results.success += response.successCount;
      results.failed += response.failureCount;

      // Handle failed tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success && (
            resp.error.code === 'messaging/invalid-registration-token' ||
            resp.error.code === 'messaging/registration-token-not-registered'
          )) {
            // Remove invalid token (async, don't wait)
            const userId = batch[idx];
            admin.firestore().collection('users').doc(userId).update({
              fcmToken: admin.firestore.FieldValue.delete()
            }).catch(console.error);
          }
        });
      }
    }

    return results;

  } catch (error) {
    console.error('❌ Error sending notifications:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// SEND NOTIFICATION TO GROUP
// ============================================
exports.sendNotificationToGroup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, notification } = data;

  if (!groupId || !notification) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing groupId or notification');
  }

  try {
    // Get group members
    const groupDoc = await admin.firestore().collection('groups').doc(groupId).get();
    
    if (!groupDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Group not found');
    }

    const members = groupDoc.data().members || [];

    // Send to all members
    const sendFunction = exports.sendNotificationToUsers;
    return await sendFunction({ userIds: members, notification }, context);

  } catch (error) {
    console.error('❌ Error sending group notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// AUTOMATED NOTIFICATIONS - TRIGGERS
// ============================================

// Order placed notification
exports.onOrderPlaced = functions.firestore
  .document('orderCycles/{cycleId}')
  .onCreate(async (snap, context) => {
    const cycleData = snap.data();
    const participants = cycleData.participants || [];

    for (const participant of participants) {
      try {
        await exports.sendNotificationToUser({
          userId: participant.userId,
          notification: {
            title: '🎉 Order Placed!',
            body: `Your order has been placed successfully.`,
            type: 'order',
            priority: 'normal',
            data: {
              type: 'order',
              orderId: context.params.cycleId,
              url: `/orders/${context.params.cycleId}`
            }
          }
        }, { auth: { uid: 'system' } });
      } catch (error) {
        console.error(`Failed to send notification to ${participant.userId}:`, error);
      }
    }
  });

// Payment window opened
exports.onPaymentWindowOpened = functions.firestore
  .document('orderCycles/{cycleId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if phase changed to payment_window
    if (before.phase !== 'payment_window' && after.phase === 'payment_window') {
      const participants = after.participants || [];

      for (const participant of participants) {
        if (participant.paymentStatus !== 'paid') {
          try {
            await exports.sendNotificationToUser({
              userId: participant.userId,
              notification: {
                title: '⏰ Payment Window Open!',
                body: 'Complete your payment now. Window closes in 4 hours.',
                type: 'payment',
                priority: 'high',
                data: {
                  type: 'payment',
                  orderId: context.params.cycleId,
                  url: `/orders/${context.params.cycleId}`
                }
              }
            }, { auth: { uid: 'system' } });
          } catch (error) {
            console.error(`Failed to send payment notification to ${participant.userId}:`, error);
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

    // Check if status changed to confirmed
    if (before.phase !== 'confirmed' && after.phase === 'confirmed') {
      const participants = after.participants || [];

      for (const participant of participants) {
        try {
          await exports.sendNotificationToUser({
            userId: participant.userId,
            notification: {
              title: '✅ Order Confirmed!',
              body: 'Your order is confirmed and being processed.',
              type: 'order',
              priority: 'high',
              data: {
                type: 'order',
                orderId: context.params.cycleId,
                url: `/orders/${context.params.cycleId}`
              }
            }
          }, { auth: { uid: 'system' } });
        } catch (error) {
          console.error(`Failed to send confirmation to ${participant.userId}:`, error);
        }
      }
    }
  });

// Export all functions
module.exports = {
  sendNotificationToUser: exports.sendNotificationToUser,
  sendNotificationToUsers: exports.sendNotificationToUsers,
  sendNotificationToGroup: exports.sendNotificationToGroup,
  onOrderPlaced: exports.onOrderPlaced,
  onPaymentWindowOpened: exports.onPaymentWindowOpened,
  onOrderConfirmed: exports.onOrderConfirmed
};