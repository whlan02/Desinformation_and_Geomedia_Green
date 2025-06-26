// Service Worker for GeoCam Website
// Provides offline functionality and caching

const CACHE_NAME = 'geocam-website-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/css/main.css',
  '/assets/css/components.css',
  '/assets/js/main.js',
  '/assets/js/verification.js',
  '/assets/js/architecture.js',
  '/assets/js/flow.js',
  '/assets/images/geocam-logo.png',
  '/assets/images/favicon.png',
  // External CDN resources
  'https://cdn.tailwindcss.com',
  'https://d3js.org/d3.v7.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[SW] Failed to cache resources:', err);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response for cache
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // If both cache and network fail, return offline page
          if (event.request.destination === 'document') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle background sync for verification results
self.addEventListener('sync', event => {
  if (event.tag === 'verification-sync') {
    event.waitUntil(syncVerificationResults());
  }
});

// Handle push notifications (if needed)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New GeoCam notification',
    icon: '/assets/images/geocam-logo.png',
    badge: '/assets/images/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open GeoCam',
        icon: '/assets/images/geocam-logo.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/images/close-icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('GeoCam', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sync verification results when back online
async function syncVerificationResults() {
  try {
    // Get pending verification results from IndexedDB
    const pendingResults = await getPendingVerificationResults();
    
    for (const result of pendingResults) {
      await submitVerificationResult(result);
      await removePendingResult(result.id);
    }
    
    console.log('[SW] Synced verification results');
  } catch (error) {
    console.error('[SW] Failed to sync verification results:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingVerificationResults() {
  // Implement IndexedDB access to get pending results
  return [];
}

async function submitVerificationResult(result) {
  // Implement API call to submit result
  return fetch('/api/verification-results', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(result)
  });
}

async function removePendingResult(id) {
  // Implement IndexedDB removal
  return Promise.resolve();
}

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Service Worker registered successfully');