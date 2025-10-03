// src/services/notificationService.js - Firebase Cloud Messaging Service
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

class NotificationService {
  constructor() {
    this.messaging = null;
    this.currentToken = null;
  }

  /**
   * Initialize Firebase Messaging
   */
  async initialize() {
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
      }

      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service workers not supported');
        return false;
      }

      // Initialize messaging
      this.messaging = getMessaging();
      
      console.log('✅ FCM initialized');
      return true;
    } catch (error) {
      console.error('❌ FCM initialization error:', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        return true;
      } else if (permission === 'denied') {
        console.log('❌ Notification permission denied');
        toast.error('Notification permission denied. Enable it in browser settings.');
        return false;
      } else {
        console.log('⏳ Notification permission dismissed');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }

  /**
   * Get FCM token
   */
  async getToken(userId) {
    try {
      if (!this.messaging) {
        await this.initialize();
      }

      if (!VAPID_KEY) {
        console.error('❌ VAPID key not found. Add VITE_FIREBASE_VAPID_KEY to .env');
        return null;
      }

      // Request permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return null;

      // Get token
      const token = await getToken(this.messaging, {
        vapidKey: VAPID_KEY
      });

      if (token) {
        this.currentToken = token;
        console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...');
        
        // Save token to Firestore
        if (userId) {
          await this.saveTokenToDatabase(userId, token);
        }
        
        return token;
      } else {
        console.log('❌ No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      
      if (error.code === 'messaging/permission-blocked') {
        toast.error('Notification permission blocked. Please enable in browser settings.');
      }
      
      return null;
    }
  }

  /**
   * Save token to Firestore
   */
  async saveTokenToDatabase(userId, token) {
    try {
      const tokenRef = doc(db, 'fcmTokens', userId);
      
      await setDoc(tokenRef, {
        userId,
        token,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        device: this.getDeviceInfo()
      }, { merge: true });

      // Also update user document
      await updateDoc(doc(db, 'users', userId), {
        fcmToken: token,
        notificationsEnabled: true,
        updatedAt: serverTimestamp()
      });

      console.log('✅ FCM token saved to database');
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  /**
   * Delete token from database
   */
  async deleteToken(userId) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        fcmToken: null,
        notificationsEnabled: false,
        updatedAt: serverTimestamp()
      });

      this.currentToken = null;
      console.log('✅ FCM token deleted');
    } catch (error) {
      console.error('Error deleting token:', error);
    }
  }

  /**
   * Listen for foreground messages
   */
  onMessageListener() {
    if (!this.messaging) {
      console.error('Messaging not initialized');
      return;
    }

    onMessage(this.messaging, (payload) => {
      console.log('📬 Foreground message received:', payload);
      
      const { notification, data } = payload;
      
      if (notification) {
        this.showNotification(
          notification.title,
          notification.body,
          notification.image,
          data
        );
      }
    });
  }

  /**
   * Show browser notification
   */
  showNotification(title, body, icon = '/logo.png', data = {}) {
    try {
      // Show toast notification
      toast(
        (t) => (
          <div className="flex items-start gap-3">
            {icon && (
              <img src={icon} alt="" className="w-10 h-10 rounded-lg" />
            )}
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-1">{title}</p>
              <p className="text-sm text-gray-600">{body}</p>
            </div>
          </div>
        ),
        {
          duration: 5000,
          position: 'top-right',
          style: {
            maxWidth: '400px'
          }
        }
      );

      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: icon || '/logo.png',
          badge: '/badge.png',
          tag: data.type || 'general',
          requireInteraction: false,
          data
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          
          // Navigate based on data
          if (data.url) {
            window.location.href = data.url;
          }
        };
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Get device info
   */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check notification permission status
   */
  getPermissionStatus() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Send notification via Cloud Function (backend)
   */
  async sendNotification(userId, notification) {
    try {
      // This should call a Cloud Function
      // For now, we'll just log it
      console.log('📤 Sending notification:', { userId, notification });
      
      // In production, call Cloud Function:
      // const response = await fetch(`${API_URL}/sendNotification`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId, notification })
      // });
      
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Notification templates
export const notificationTemplates = {
  orderPlaced: (orderNumber) => ({
    title: '🎉 Order Placed!',
    body: `Your order #${orderNumber} has been placed successfully.`,
    type: 'order',
    priority: 'high'
  }),

  paymentWindow: (timeLeft) => ({
    title: '⏰ Payment Reminder',
    body: `Payment window ends in ${timeLeft}. Complete payment now!`,
    type: 'payment',
    priority: 'high'
  }),

  paymentSuccess: (amount) => ({
    title: '✅ Payment Successful',
    body: `Your payment of ₹${amount} was successful.`,
    type: 'payment',
    priority: 'normal'
  }),

  orderConfirmed: (deliveryDate) => ({
    title: '✅ Order Confirmed',
    body: `Your order is confirmed! Expected delivery: ${deliveryDate}`,
    type: 'order',
    priority: 'high'
  }),

  orderShipped: (trackingId) => ({
    title: '🚚 Order Shipped',
    body: `Your order is on the way! Track: ${trackingId}`,
    type: 'order',
    priority: 'high'
  }),

  orderDelivered: () => ({
    title: '📦 Order Delivered',
    body: 'Your order has been delivered. Enjoy!',
    type: 'order',
    priority: 'normal'
  }),

  groupMinimumMet: (productName) => ({
    title: '🎯 Minimum Reached!',
    body: `Group goal met for ${productName}. Order proceeding!`,
    type: 'group',
    priority: 'normal'
  }),

  newGroupMember: (groupName) => ({
    title: '👋 New Member',
    body: `Someone joined ${groupName}. Check it out!`,
    type: 'group',
    priority: 'low'
  }),

  priceAlert: (productName, discount) => ({
    title: '💰 Price Drop!',
    body: `${productName} now ${discount}% off! Limited time.`,
    type: 'promotion',
    priority: 'normal'
  })
};

export default notificationService;