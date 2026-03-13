/**
 * Server-side Web Push helpers.
 *
 * Requires these env vars:
 *   VAPID_PUBLIC_KEY        — base64url VAPID public key
 *   VAPID_PRIVATE_KEY       — base64url VAPID private key
 *   VAPID_SUBJECT           — mailto: or https: contact URI  (default: mailto:prakhar@nandann.com)
 *
 * Generate a key pair (run once):
 *   npx web-push generate-vapid-keys
 */

import webpush from 'web-push';
import prisma from '@/lib/db';

const isConfigured =
    !!process.env.VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY;

if (isConfigured) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:prakhar@nandann.com',
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!,
    );
}

export interface PushPayload {
    title: string;
    body:  string;
    url?:  string;   // path to open on click, e.g. '/dashboard/tasks?taskId=xxx'
    tag?:  string;   // collapses duplicate notifications on the device
}

/**
 * Send a push notification to every registered device belonging to `userId`.
 * Silently removes expired / invalid subscriptions from the DB.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!isConfigured) return;

    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return;

    const body = JSON.stringify(payload);

    await Promise.all(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    body,
                );
            } catch (err: any) {
                // 404/410 means the subscription is no longer valid — clean it up
                if (err?.statusCode === 404 || err?.statusCode === 410) {
                    await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
                } else {
                    console.error('Push send error for sub', sub.id, err?.statusCode, err?.body);
                }
            }
        })
    );
}

/**
 * Send a push to all ADMIN users who have a registered device.
 */
export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
    if (!isConfigured) return;

    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
    });

    await Promise.all(admins.map((a) => sendPushToUser(a.id, payload)));
}
