// Nandann Goal — Service Worker
// Handles Web Push notifications and notification click events.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// ── Push received ──────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
    let data = { title: 'Nandann Goal', body: '', url: '/dashboard', tag: 'nandann' };
    try {
        if (event.data) Object.assign(data, event.data.json());
    } catch (_) { /* ignore malformed payload */ }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body:    data.body,
            icon:    '/icon-192.png',
            badge:   '/icon-192.png',
            tag:     data.tag,          // collapses duplicate notifications
            renotify: true,
            data:    { url: data.url },
        })
    );
});

// ── Notification clicked ───────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // If the app is already open, focus and navigate it
                for (const client of windowClients) {
                    if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                        client.focus();
                        client.navigate(targetUrl);
                        return;
                    }
                }
                // Otherwise open a new tab
                if (self.clients.openWindow) {
                    return self.clients.openWindow(targetUrl);
                }
            })
    );
});
