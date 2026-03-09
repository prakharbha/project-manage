import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const params = await context.params;
        const notificationId = params.id;

        const { isRead } = await req.json();

        // Verify ownership
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId }
        });

        if (!notification || notification.userId !== session.userId) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        const updated = await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: Boolean(isRead) }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
