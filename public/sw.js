/**
 * SisterCare Service Worker
 * Enables offline access and caching for the PWA
 */

const CACHE_NAME = "sistercare-v1";
const OFFLINE_URL = "/offline.html";

// Assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/chat",
  "/library",
  "/offline.html",
  "/manifest.json",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          }),
      );
    }),
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip API requests (always go to network for fresh data)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return cached response for chat API if offline
        if (url.pathname === "/api/chat") {
          return new Response(
            JSON.stringify({
              response:
                "I'm currently offline, but I'm still here for you! 💜 Please check your internet connection and try again. If you're experiencing an emergency, please call 999 or visit your nearest hospital.",
              source: "offline",
              type: "agent",
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        return new Response(JSON.stringify({ error: "Offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    return;
  }

  // For page navigations, try network first, fall back to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page loads
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try to serve from cache
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Serve offline page
            return caches.match(OFFLINE_URL);
          });
        }),
    );
    return;
  }

  // For other assets, try cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached and update in background
        fetch(request).then((response) => {
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response);
            });
          }
        });
        return cached;
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    }),
  );
});

// Push notification handling
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "You have a new notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/dashboard",
    },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "SisterCare", options),
  );
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Check if already open
      for (const client of clients) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    }),
  );
});

// Background sync for offline symptom logging
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-symptoms") {
    event.waitUntil(syncSymptoms());
  }
});

async function syncSymptoms() {
  // Get pending symptom logs from IndexedDB
  // This would sync data logged while offline
  console.log("[SW] Syncing offline symptom logs...");
}
