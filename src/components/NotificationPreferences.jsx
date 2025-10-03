// src/components/NotificationPreferences.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import notificationService from '../services/notificationService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  BellIcon, 
  BellSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function NotificationPreferences() {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);
  const [preferences, setPreferences] = useState({
    pushEnabled: false,
    emailEnabled: true,
    smsEnabled: false,
    orderUpdates: true,
    paymentReminders: true,
    groupNotifications: true,
    promotions: false,
    priceAlerts: true
  });

  useEffect(() => {
    checkPermissionStatus();
    loadPreferences();
  }, [userProfile]);

  const checkPermissionStatus = () => {
    const status = notificationService.getPermissionStatus();
    setPermissionStatus(status);
  };

  const loadPreferences = () => {
    if (userProfile?.notificationPreferences) {
      setPreferences({
        ...preferences,
        ...userProfile.notificationPreferences,
        pushEnabled: userProfile.notificationsEnabled || false
      });
    }
    setFcmToken(userProfile?.fcmToken || null);
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    
    try {
      // Initialize FCM
      const initialized = await notificationService.initialize();
      if (!initialized) {
        toast.error('Notifications not supported on this browser');
        setLoading(false);
        return;
      }

      // Get FCM token
      const token = await notificationService.getToken(currentUser.uid);
      
      if (token) {
        setFcmToken(token);
        setPreferences(prev => ({ ...prev, pushEnabled: true }));
        
        // Start listening for foreground messages
        notificationService.onMessageListener();
        
        toast.success('Notifications enabled! 🔔', { duration: 5000 });
        setPermissionStatus('granted');
      } else {
        toast.error('Failed to enable notifications');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    
    try {
      await notificationService.deleteToken(currentUser.uid);
      setFcmToken(null);
      setPreferences(prev => ({ ...prev, pushEnabled: false }));
      
      toast.success('Notifications disabled');
      setPermissionStatus('denied');
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        notificationPreferences: newPreferences,
        updatedAt: serverTimestamp()
      });
      
      toast.success('Preference updated');
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update preference');
    }
  };

  const handleTestNotification = () => {
    notificationService.showNotification(
      '🎉 Test Notification',
      'This is how notifications will appear!',
      '/logo.png',
      { type: 'test' }
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
            <BellIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Notification Settings
            </h3>
            <p className="text-sm text-gray-600">
              Manage how you receive updates
            </p>
          </div>
        </div>

        {/* Test Button */}
        {preferences.pushEnabled && (
          <button
            onClick={handleTestNotification}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
          >
            Test Notification
          </button>
        )}
      </div>

      {/* Permission Status */}
      <div className={`mb-6 p-4 rounded-xl border-2 ${
        permissionStatus === 'granted'
          ? 'bg-green-50 border-green-200'
          : permissionStatus === 'denied'
          ? 'bg-red-50 border-red-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-3">
          {permissionStatus === 'granted' ? (
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          ) : permissionStatus === 'denied' ? (
            <XCircleIcon className="h-6 w-6 text-red-600" />
          ) : (
            <BellIcon className="h-6 w-6 text-yellow-600" />
          )}
          
          <div className="flex-1">
            <p className={`font-semibold ${
              permissionStatus === 'granted'
                ? 'text-green-900'
                : permissionStatus === 'denied'
                ? 'text-red-900'
                : 'text-yellow-900'
            }`}>
              {permissionStatus === 'granted'
                ? 'Notifications Enabled'
                : permissionStatus === 'denied'
                ? 'Notifications Blocked'
                : 'Notifications Not Enabled'
              }
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {permissionStatus === 'granted'
                ? 'You will receive push notifications for important updates'
                : permissionStatus === 'denied'
                ? 'Enable notifications in your browser settings to receive updates'
                : 'Enable notifications to stay updated on your orders'
              }
            </p>
          </div>

          {permissionStatus !== 'denied' && (
            <button
              onClick={preferences.pushEnabled ? handleDisableNotifications : handleEnableNotifications}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
                preferences.pushEnabled
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading ? 'Loading...' : preferences.pushEnabled ? 'Disable' : 'Enable'}
            </button>
          )}
        </div>
      </div>

      {/* FCM Token Info (Debug) */}
      {fcmToken && import.meta.env.DEV && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 font-mono break-all">
            Token: {fcmToken.substring(0, 50)}...
          </p>
        </div>
      )}

      {/* Notification Categories */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 mb-3">
          Notification Types
        </h4>

        {/* Push Notifications */}
        <NotificationToggle
          icon={BellIcon}
          title="Push Notifications"
          description="Receive instant alerts on your device"
          enabled={preferences.pushEnabled}
          onChange={(val) => val ? handleEnableNotifications() : handleDisableNotifications()}
          disabled={permissionStatus === 'denied'}
        />

        {/* Email Notifications */}
        <NotificationToggle
          icon={BellIcon}
          title="Email Notifications"
          description="Get updates via email"
          enabled={preferences.emailEnabled}
          onChange={(val) => handlePreferenceChange('emailEnabled', val)}
        />

        {/* SMS Notifications */}
        <NotificationToggle
          icon={BellIcon}
          title="SMS Notifications"
          description="Receive text messages for urgent updates"
          enabled={preferences.smsEnabled}
          onChange={(val) => handlePreferenceChange('smsEnabled', val)}
          badge="Premium"
        />

        <div className="border-t border-gray-200 my-6"></div>

        <h4 className="font-semibold text-gray-900 mb-3">
          Notification Preferences
        </h4>

        {/* Order Updates */}
        <NotificationToggle
          icon={SparklesIcon}
          title="Order Updates"
          description="Status updates for your orders"
          enabled={preferences.orderUpdates}
          onChange={(val) => handlePreferenceChange('orderUpdates', val)}
        />

        {/* Payment Reminders */}
        <NotificationToggle
          icon={SparklesIcon}
          title="Payment Reminders"
          description="Alerts when payment is due"
          enabled={preferences.paymentReminders}
          onChange={(val) => handlePreferenceChange('paymentReminders', val)}
        />

        {/* Group Notifications */}
        <NotificationToggle
          icon={SparklesIcon}
          title="Group Activity"
          description="Updates from your groups"
          enabled={preferences.groupNotifications}
          onChange={(val) => handlePreferenceChange('groupNotifications', val)}
        />

        {/* Price Alerts */}
        <NotificationToggle
          icon={SparklesIcon}
          title="Price Alerts"
          description="When prices drop on products"
          enabled={preferences.priceAlerts}
          onChange={(val) => handlePreferenceChange('priceAlerts', val)}
        />

        {/* Promotions */}
        <NotificationToggle
          icon={SparklesIcon}
          title="Promotions & Offers"
          description="Special deals and discounts"
          enabled={preferences.promotions}
          onChange={(val) => handlePreferenceChange('promotions', val)}
        />
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-900">
          <strong>💡 Tip:</strong> Enable push notifications for instant updates. 
          You can always change these settings later.
        </p>
      </div>
    </div>
  );
}

// Toggle Component
function NotificationToggle({ icon: Icon, title, description, enabled, onChange, disabled, badge }) {
  return (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div className="flex items-start gap-3 flex-1">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h5 className="font-semibold text-gray-900">{title}</h5>
            {badge && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          enabled ? 'bg-green-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}