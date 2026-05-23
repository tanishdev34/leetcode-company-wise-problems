const CACHE_NAME = "lc-tracker-v1"
const STATIC_URLS = ["/", "/reviews", "/questions/"]

// Install: cache static pages
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_URLS)
    })
  )
})

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    })
  )
})

// Fetch: cache API responses for reviews, serve cached when offline
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // Cache review-related API calls
  if (url.pathname.startsWith("/api/") && (
    url.pathname.includes("review") ||
    url.pathname.includes("question") ||
    url.pathname.includes("stats") ||
    url.pathname.includes("overlay")
  )) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone())
            return response
          })
          .catch(() => cache.match(event.request))
      })
    )
    return
  }

  // For navigation requests, try network first, fallback to cached
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/"))
    )
    return
  }
})

// Listen for messages to clear cache
self.addEventListener("message", (event) => {
  if (event.data === "CACHE_UPDATED") {
    // Re-fetch critical data
    self.skipWaiting()
  }
})
