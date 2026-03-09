import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const notifications = await prisma.notification.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: 'desc' },
            take: 20 // limit to recent 20
        });

        return NextResponse.json(notifications);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
