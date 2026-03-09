import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const params = await context.params;
        const taskId = params.id;

        const body = await req.json();
        const { status, billingHours, eta, isPriority } = body;

        // Verify task exists and authorization
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true }
        });

        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

        if (session.role === 'CLIENT' && task.project.clientId !== session.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const dataToUpdate: any = {};

        if (session.role === 'ADMIN') {
            if (status !== undefined) dataToUpdate.status = status;
            if (billingHours !== undefined) dataToUpdate.billingHours = Number(billingHours);
            if (eta !== undefined) dataToUpdate.eta = eta ? new Date(eta) : null;
            if (isPriority !== undefined) dataToUpdate.isPriority = Boolean(isPriority);
        } else {
            // Clients can only toggle priority
            if (isPriority !== undefined) dataToUpdate.isPriority = Boolean(isPriority);
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided or unauthorized to edit these fields' }, { status: 400 });
        }

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: dataToUpdate
        });
        return NextResponse.json(updatedTask);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
