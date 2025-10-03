// public/firebase-messaging-sw.js - Service Worker for FCM Background Messages
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyBlbgPlYZnHUZ8gGmDm7pFQlpGubGbUYZY",
  authDomain: "hyperlocal-1e0d5.firebaseapp.com",
  projectId: "hyperlocal-1e0d5",
  storageBucket: "hyperlocal-1e0d5.firebasestorage.app",
  messagingSenderId: "554130415887",
  appId: "1:554130415887:web:0dfe67e0ae65425e409e7a"
});

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Background message received:', payload);

  const { notification, data } = payload;
  
  const notificationTitle = notification?.title || 'GroupBuy Notification';
  const notificationOptions = {
    body: notification?.body || 'You have a new notification',
    icon: notification?.icon || '/logo.png',
    badge: '/badge.png',
    image: notification?.image,
    tag: data?.type || 'general',
    requireInteraction: data?.priority === 'high',
    vibrate: [200, 100, 200],
    data: {
      ...data,
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ]
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();

  const { data } = event.notification;
  const action = event.action;

  if (action === 'dismiss') {
    return;
  }

  // Determine URL based on notification type
  let urlToOpen = '/';
  
  if (data.url) {
    urlToOpen = data.url;
  } else if (data.type === 'order') {
    urlToOpen = `/orders/${data.orderId || ''}`;
  } else if (data.type === 'payment') {
    urlToOpen = `/orders/${data.orderId || ''}`;
  } else if (data.type === 'group') {
    urlToOpen = `/groups/${data.groupId || ''}`;
  } else if (data.type === 'promotion') {
    urlToOpen = '/products';
  }

  // Open the URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle push event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', data);

    const { notification } = data;
    if (notification) {
      event.waitUntil(
        self.registration.showNotification(
          notification.title,
          {
            body: notification.body,
            icon: notification.icon || '/logo.png',
            badge: '/badge.png',
            data: data.data
          }
        )
      );
    }
  } catch (error) {
    console.error('[Service Worker] Error parsing push data:', error);
  }
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  event.waitUntil(clients.claim());
});

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
  self.skipWaiting();
});

console.log('[Service Worker] Firebase Messaging Service Worker loaded');