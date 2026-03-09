import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const where = session.role === 'ADMIN' ? {} : { clientId: session.userId };

        const projects = await prisma.project.findMany({
            where,
            include: { client: { select: { id: true, companyName: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(projects);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
