import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { projectId, name, description, isPriority } = await req.json();

        if (!projectId || !name) {
            return NextResponse.json({ error: 'Project and Name are required' }, { status: 400 });
        }

        // Validate project exists and user has access
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        if (session.role === 'CLIENT' && project.clientId !== session.userId) {
            return NextResponse.json({ error: 'Unauthorized for this project' }, { status: 403 });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
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
                    userId: project.clientId,
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
