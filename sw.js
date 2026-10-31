const CACHE = "quiz-mastermind-v38";
// Relative paths so the same service worker works on GitHub Pages subpaths and custom domains.
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

function withCOIHeaders(response) {
  if (!response || response.status === 0 || response.type === "opaque") return response;
  const headers = new Headers(response.headers);
  // same-origin-allow-popups preserves OAuth sign-in popups (Puter, Hugging Face, etc.)
  // while still granting cross-origin resource and isolation security policies.
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // API + localhost calls pass through
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put("./index.html", res.clone()));
          return withCOIHeaders(res);
        })
        .catch(() => caches.match("./index.html").then((r) => r ? withCOIHeaders(r) : r))
    );
    return;
  }
  // Network-first strategy for app bundles and assets so code updates deploy immediately
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return withCOIHeaders(res);
      })
      .catch(() => caches.match(req).then((r) => r ? withCOIHeaders(r) : r))
  );
});

