// public/service-worker.js
const CACHE_NAME = 'liga-record-v2';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/icon-72x72.png',
  '/icon-96x96.png', 
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-192x192.png',
  '/icon-384x384.png',
  '/icon-512x512.png',
  '/trophy-favicon.svg'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache aberto - Liga Record PWA');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('❌ Erro ao cachear recursos:', error);
      })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('liga-record')) {
            console.log('🗑️ Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Strategy - Network First com Cache Fallback otimizado
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Handle Firebase API calls
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('firebaseapp.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response before caching
          const responseToCache = response.clone();
          
          // Cache successful Firebase responses
          if (response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Return cached version if available
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              console.log('📱 Usando cache offline para:', event.request.url);
              return cachedResponse;
            }
            // Return a custom offline response for API calls
            return new Response(
              JSON.stringify({ 
                offline: true, 
                message: 'Dados offline não disponíveis' 
              }),
              { 
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          });
        })
    );
    return;
  }

  // Handle static assets with Cache First strategy
  if (event.request.url.includes('/static/') || 
      event.request.url.includes('/icon-') ||
      event.request.url.includes('.png') ||
      event.request.url.includes('.svg')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            if (!response || response.status !== 200) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            return response;
          });
        })
    );
    return;
  }

  // For navigation requests, try network first, then cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(response => {
          if (response) {
            return response;
          }
          
          // Return app shell for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// Background Sync for offline actions
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-players') {
    event.waitUntil(syncPlayers());
  } else if (event.tag === 'sync-rounds') {
    event.waitUntil(syncRounds());
  } else if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

// Push Notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Nova atualização na Liga Record!',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    image: data.image,
    vibrate: [100, 50, 100],
    tag: data.tag || 'liga-record-notification',
    requireInteraction: data.requireInteraction || false,
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/',
      ...data
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalhes',
        icon: '/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Liga Record 🏆', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    const urlToOpen = event.notification.data.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          // Check if there is already a window/tab open
          for (let client of windowClients) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // If not, open a new window/tab
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Periodic Background Sync (for newer browsers)
self.addEventListener('periodicsync', event => {
  console.log('⏰ Periodic sync triggered:', event.tag);
  
  if (event.tag === 'update-stats') {
    event.waitUntil(updateStats());
  } else if (event.tag === 'check-payments') {
    event.waitUntil(checkPayments());
  }
});

// Message handler for client communication
self.addEventListener('message', event => {
  console.log('📨 Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Sync functions
async function syncPlayers() {
  try {
    console.log('🔄 Syncing players data...');
    // Implementação do sync com Firebase
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: 'players'
      });
    });
  } catch (error) {
    console.error('❌ Error syncing players:', error);
  }
}

async function syncRounds() {
  try {
    console.log('🔄 Syncing rounds data...');
    // Implementação do sync
  } catch (error) {
    console.error('❌ Error syncing rounds:', error);
  }
}

async function syncTransactions() {
  try {
    console.log('🔄 Syncing transactions data...');
    // Implementação do sync
  } catch (error) {
    console.error('❌ Error syncing transactions:', error);
  }
}

async function updateStats() {
  try {
    console.log('📊 Updating statistics...');
    // Implementação da atualização de estatísticas
  } catch (error) {
    console.error('❌ Error updating stats:', error);
  }
}

async function checkPayments() {
  try {
    console.log('💰 Checking pending payments...');
    // Implementação da verificação de pagamentos
  } catch (error) {
    console.error('❌ Error checking payments:', error);
  }
}