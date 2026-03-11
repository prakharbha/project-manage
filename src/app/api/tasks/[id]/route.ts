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
        const { status, billingHours, billingItems, eta, isPriority } = body;

        // Verify task exists and authorization
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

        if (session.role === 'CLIENT' && task.clientId !== session.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const dataToUpdate: any = {};

        if (session.role === 'ADMIN') {
            if (status !== undefined) dataToUpdate.status = status;

            // Allow explicit billingHours override, or auto-calc based on items provided
            if (billingItems !== undefined) {
                dataToUpdate.billingItems = billingItems;
                if (!billingHours) {
                    const calculatedHours = Array.isArray(billingItems)
                        ? billingItems.reduce((acc: number, item: any) => acc + (Number(item.hours) || 0), 0)
                        : 0;
                    dataToUpdate.billingHours = calculatedHours;
                } else {
                    dataToUpdate.billingHours = Number(billingHours);
                }
            } else if (billingHours !== undefined) {
                dataToUpdate.billingHours = Number(billingHours);
            }

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

        // Sync client's overall billedHours if Admin modified billing entries
        if (session.role === 'ADMIN' && (billingItems !== undefined || billingHours !== undefined)) {
            const totalBilled = await prisma.task.aggregate({
                where: { clientId: task.clientId },
                _sum: { billingHours: true }
            });

            await prisma.user.update({
                where: { id: task.clientId },
                data: { billedHours: totalBilled._sum?.billingHours || 0 }
            });
        }

        return NextResponse.json(updatedTask);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const params = await context.params;
        const taskId = params.id;

        await prisma.task.delete({
            where: { id: taskId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
