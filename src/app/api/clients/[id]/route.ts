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
        const clientId = params.id;

        const body = await req.json();
        const { name, companyName, email, advanceHours, billedHours } = body;

        const dataToUpdate: any = {};
        if (name !== undefined) dataToUpdate.name = name;
        if (companyName !== undefined) dataToUpdate.companyName = companyName;
        if (email !== undefined) dataToUpdate.email = email;
        if (advanceHours !== undefined) dataToUpdate.advanceHours = Number(advanceHours);
        if (billedHours !== undefined) dataToUpdate.billedHours = Number(billedHours);

        if (Object.keys(dataToUpdate).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
        }

        const updatedClient = await prisma.user.update({
            where: { id: clientId, role: 'CLIENT' }, // Ensure we only update clients
            data: dataToUpdate
        });

        return NextResponse.json(updatedClient);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const clientId = params.id;

        await prisma.user.delete({
            where: { id: clientId, role: 'CLIENT' }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
