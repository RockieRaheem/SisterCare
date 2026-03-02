/**
 * SisterCare Service Worker v2
 * Enhanced offline support, caching strategies, and push notifications
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `sistercare-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `sistercare-dynamic-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Core assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/chat",
  "/library",
  "/settings",
  "/profile",
  "/counsellors",
  "/analytics",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon.svg",
];

// Fonts and external resources to cache
const FONT_URLS = [
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Caching static assets");
      // Cache static assets (don't fail if some are missing)
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to cache: ${url}`, err);
          }),
        ),
      );
    }),
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name.startsWith("sistercare-") &&
              name !== STATIC_CACHE &&
              name !== DYNAMIC_CACHE
            );
          })
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - sophisticated caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith("http")) return;

  // Strategy 1: API requests - Network first, cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request, url));
    return;
  }

  // Strategy 2: Font files - Cache first (they rarely change)
  if (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com")
  ) {
    event.respondWith(handleFontRequest(request));
    return;
  }

  // Strategy 3: Static assets - Cache first, network fallback
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Strategy 4: Page navigations - Network first, cache fallback, offline page
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Strategy 5: Other requests - Stale-while-revalidate
  event.respondWith(handleDynamicRequest(request));
});

// Helper function to identify static assets
function isStaticAsset(pathname) {
  const staticExtensions = [
    ".js",
    ".css",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
  ];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// Handle API requests - Network first
async function handleApiRequest(request, url) {
  try {
    const response = await fetch(request, {
      cache: "no-store",
      credentials: "same-origin",
    });
    return response;
  } catch (error) {
    // Return offline fallback for chat API
    if (url.pathname === "/api/chat") {
      return new Response(
        JSON.stringify({
          response:
            "I'm currently offline, but I'm still here for you! 💜 Please check your internet connection and try again.",
          source: "offline",
          type: "agent",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // Return cached version if available
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response(
      JSON.stringify({ error: "Offline", message: "No internet connection" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Handle font requests - Cache first
async function handleFontRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn("[SW] Font fetch failed:", error);
    return new Response("", { status: 404 });
  }
}

// Handle static assets - Cache first
async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn("[SW] Static asset fetch failed:", error);
    return new Response("", { status: 404 });
  }
}

// Handle navigation - Network first with offline fallback
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Try cache first
    const cached = await caches.match(request);
    if (cached) return cached;

    // Serve offline page
    const offlinePage = await caches.match(OFFLINE_URL);
    if (offlinePage) return offlinePage;

    return new Response("Offline", { status: 503 });
  }
}

// Handle dynamic requests - Stale-while-revalidate
async function handleDynamicRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise) || new Response("", { status: 404 });
}

// Push notification handling
self.addEventListener("push", (event) => {
  console.log("[SW] Push received");

  let data = { title: "SisterCare", body: "You have a new notification" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    tag: data.tag || "sistercare-notification",
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || "/dashboard",
      type: data.type || "general",
    },
    actions: [
      { action: "open", title: "Open", icon: "/icons/icon-192x192.png" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus existing window if open
        for (const client of clients) {
          if (
            client.url.includes(
              new URL(urlToOpen, self.location.origin).pathname,
            ) &&
            "focus" in client
          ) {
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

// Background sync for offline data
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);

  if (event.tag === "sync-symptoms") {
    event.waitUntil(syncOfflineData("symptoms"));
  }
  if (event.tag === "sync-periods") {
    event.waitUntil(syncOfflineData("periods"));
  }
});

// Periodic background sync for scheduled notifications
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-reminders") {
    event.waitUntil(checkScheduledReminders());
  }
});

// Sync offline data when connection restored
async function syncOfflineData(type) {
  console.log(`[SW] Syncing offline ${type}...`);
  // This would be implemented with IndexedDB for offline-first storage
  // For now, just log
}

// Check for scheduled reminders
async function checkScheduledReminders() {
  console.log("[SW] Checking scheduled reminders...");
  // This would check stored reminder times and trigger notifications
}
