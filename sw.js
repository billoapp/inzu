const CACHE_NAME = 'inzu-v6'; // Restart from v1
const APP_VERSION = '1.1.3'; // Restart from 1.0.0
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/styles.css',
  '/script.js',
  '/firebase-config.js'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log(`Installing service worker version ${APP_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker and handle updates
self.addEventListener('activate', event => {
  console.log(`Activating service worker version ${APP_VERSION}`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all open pages
      return self.clients.claim();
    })
  );
});

// Fetch with network-first strategy for better updates
self.addEventListener('fetch', event => {
  // Skip Firebase requests - let them go through directly
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('firebasestorage.app') ||
      event.request.url.includes('firebaseapp.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If request is successful, cache it
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request);
      })
  );
});

// Listen for messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Skip waiting requested - activating new service worker');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});

// Background Sync (for offline changes)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-rental-data') {
    event.waitUntil(syncData());
  }
});

// Push Notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Rental Manager Update',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'rental-update'
    }
  };

  event.waitUntil(
    self.registration.showNotification('Rental Manager', options)
  );
});

// Notification Click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus();
        }
        return clients.openWindow('/');
      })
  );
});

// Sync data function
async function syncData() {
  // This would be called when device comes back online
  console.log('Background sync triggered');
  
  // You can implement specific sync logic here
  // For example, send pending changes to server
}