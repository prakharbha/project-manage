import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { clientId, name, description, isPriority } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        let resolvedClientId = clientId;

        // If client is creating a task, auto-assign to themselves
        if (session.role === 'CLIENT') {
            resolvedClientId = session.userId;
        }

        if (!resolvedClientId) {
            return NextResponse.json({ error: 'A Client ID is required for Admins' }, { status: 400 });
        }

        // Validate client exists if Admin is assigning
        if (session.role === 'ADMIN') {
            const targetClient = await prisma.user.findUnique({ where: { id: resolvedClientId, role: 'CLIENT' } });
            if (!targetClient) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const task = await prisma.task.create({
            data: {
                clientId: resolvedClientId,
                name,
                description,
                isPriority: Boolean(isPriority),
                status: 'PENDING',
            }
        });

        // Trigger Real Notifications
        if (session.role === 'CLIENT') {
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
            if (admins.length > 0) {
                await prisma.notification.createMany({
                    data: admins.map(admin => ({
                        userId: admin.id,
                        type: 'TASK_CREATED',
                        message: `New task from client: ${name}`,
                        link: '/dashboard/tasks'
                    }))
                });
            }
        } else {
            await prisma.notification.create({
                data: {
                    userId: resolvedClientId,
                    type: 'TASK_CREATED',
                    message: `New task assigned: ${name}`,
                    link: '/dashboard'
                }
            });
        }

        // TODO: Send email notification if needed

        return NextResponse.json(task, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
