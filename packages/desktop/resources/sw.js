self.addEventListener('install', () => {
  // Skip waiting for activation. Only has an effect if there's a newly
  // installed service worker that would otherwise remain in the `waiting`
  // state.
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  // Claim clients to ensure that updates to the underlying service worker
  // take effect immediately. Normally when a service worker is updated,
  // pages won't use it until the next load.
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Use the default browser handling for requests where:
  // - The request method is not GET.
  // - The request is a navigation request.
  // - The request is to the same origin as the service worker.
  if (
    event.request.method !== 'GET' ||
    event.request.mode === 'navigate' ||
    new URL(event.request.url).origin === self.location.origin
  ) {
    return;
  }

  event.respondWith(handleFetch(event));
});

/**
 * Config-related state.
 *
 * The cache config is asynchronously resolved by posting a message from
 * the initialization script.
 */
const deferredConfig = {
  value: null,
  resolve: null,
  promise: new Promise(resolve =>
    setTimeout(() => (deferredConfig.resolve = resolve)),
  ),
};

self.addEventListener('message', event => {
  switch (event.data.type) {
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache());
      break;
    case 'SET_CONFIG':
      deferredConfig.value = event.data.config;
      deferredConfig.resolve();
      break;
    default:
      console.error(
        'Service worker received unknown message type:',
        event.data,
      );
  }
});

async function clearCache() {
  const cache = await caches.open('v1');
  const keys = await cache.keys();
  await Promise.all(keys.map(key => cache.delete(key)));
}

async function handleFetch(event) {
  // Wait for config to be set before processing any requests.
  const config = await deferredConfig.promise.then(
    () => deferredConfig.value,
  );

  // First, try to get the resource from the cache.
  const cache = await caches.open('v1');
  const cachedResponse = await cache.match(event.request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Otherwise, fetch the resource from the network.
    const networkResponse = await fetch(event.request);

    // Cache the response if its status is in the 200-299 range or if
    // it's opaque. Opaque responses are from requests with 'no-cors',
    // and have a status of 0.
    if (
      networkResponse &&
      (networkResponse.ok || networkResponse.type === 'opaque')
    ) {
      await cache.put(event.request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    return new Response('Offline or network error occurred.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({ 'Content-Type': 'text/plain' }),
    });
  }
}
