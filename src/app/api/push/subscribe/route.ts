import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { checkCsrf, csrfError } from '@/lib/security';

// ── POST /api/push/subscribe — register a push subscription ───────────────
export async function POST(req: Request) {
    if (!checkCsrf(req)) return csrfError();

    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { endpoint, keys } = body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
        }

        // Upsert — if this exact endpoint already exists just update its keys
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: { p256dh: keys.p256dh, auth: keys.auth, userId: session.userId },
            create: { userId: session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        });

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/push/subscribe error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ── DELETE /api/push/subscribe — unregister a push subscription ───────────
export async function DELETE(req: Request) {
    if (!checkCsrf(req)) return csrfError();

    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { endpoint } = await req.json();
        if (!endpoint) return NextResponse.json({ error: 'endpoint is required' }, { status: 400 });

        await prisma.pushSubscription
            .deleteMany({ where: { endpoint, userId: session.userId } })
            .catch(() => null); // ignore if already gone

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE /api/push/subscribe error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
