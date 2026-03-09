import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const taskId = params.id;

        const body = await req.json();
        const { status, billingHours, eta } = body;

        const dataToUpdate: any = {};
        if (status !== undefined) dataToUpdate.status = status;
        if (billingHours !== undefined) dataToUpdate.billingHours = Number(billingHours);
        if (eta !== undefined) dataToUpdate.eta = eta ? new Date(eta) : null;

        if (Object.keys(dataToUpdate).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
        }

        const task = await prisma.task.update({
            where: { id: taskId },
            data: dataToUpdate
        });
        return NextResponse.json(task);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
