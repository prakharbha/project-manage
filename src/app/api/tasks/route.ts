import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { checkCsrf, csrfError, auditLog } from '@/lib/security';

const MAX_BODY_BYTES = 64 * 1_024;

export async function POST(req: Request) {
    // CSRF check
    if (!checkCsrf(req)) return csrfError();

    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Body size guard
        const contentLength = Number(req.headers.get('content-length') ?? 0);
        if (contentLength > MAX_BODY_BYTES) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
        }

        const { clientId, name, description, isPriority } = await req.json();

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Task name is required' }, { status: 400 });
        }
        if (name.length > 500) {
            return NextResponse.json({ error: 'Task name must not exceed 500 characters' }, { status: 400 });
        }
        if (description !== undefined && typeof description === 'string' && description.length > 10_000) {
            return NextResponse.json({ error: 'Description must not exceed 10 000 characters' }, { status: 400 });
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
                name: name.trim(),
                description,
                isPriority: Boolean(isPriority),
                status: 'PENDING',
            }
        });

        // In-app notifications
        if (session.role === 'CLIENT') {
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
            if (admins.length > 0) {
                await prisma.notification.createMany({
                    data: admins.map(admin => ({
                        userId: admin.id,
                        type: 'TASK_CREATED',
                        message: `New task from client: ${name.trim()}`,
                        link: '/dashboard/tasks'
                    }))
                });
            }
        } else {
            await prisma.notification.create({
                data: {
                    userId: resolvedClientId,
                    type: 'TASK_CREATED',
                    message: `New task assigned: ${name.trim()}`,
                    link: '/dashboard'
                }
            });
            auditLog('TASK_CREATED', session.userId, { taskId: task.id, clientId: resolvedClientId });
        }

        return NextResponse.json(task, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/tasks error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
