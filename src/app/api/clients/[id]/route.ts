import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { checkCsrf, csrfError, auditLog } from '@/lib/security';

const CLIENT_SELECT = {
    id: true,
    name: true,
    companyName: true,
    email: true,
    role: true,
    advanceHours: true,
    billedHours: true,
    notifyTaskUpdates: true,
    notifyComments: true,
    notifyBillingUpdates: true,
    createdAt: true,
    updatedAt: true,
} as const;

const MAX_BODY_BYTES = 64 * 1_024;

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    // CSRF check
    if (!checkCsrf(req)) return csrfError();

    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await context.params;
        const clientId = params.id;

        // Body size guard
        const contentLength = Number(req.headers.get('content-length') ?? 0);
        if (contentLength > MAX_BODY_BYTES) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
        }

        const body = await req.json();
        const { name, companyName, email, advanceHours, billedHours } = body;

        const dataToUpdate: Record<string, unknown> = {};
        if (name !== undefined) dataToUpdate.name = String(name).trim().slice(0, 200);
        if (companyName !== undefined) dataToUpdate.companyName = String(companyName).trim().slice(0, 200);
        if (email !== undefined) dataToUpdate.email = String(email).trim();

        if (advanceHours !== undefined) {
            const h = Number(advanceHours);
            if (isNaN(h) || h < 0 || h > 100_000) {
                return NextResponse.json({ error: 'advanceHours must be a number between 0 and 100000' }, { status: 400 });
            }
            dataToUpdate.advanceHours = h;
        }
        if (billedHours !== undefined) {
            const h = Number(billedHours);
            if (isNaN(h) || h < 0 || h > 100_000) {
                return NextResponse.json({ error: 'billedHours must be a number between 0 and 100000' }, { status: 400 });
            }
            dataToUpdate.billedHours = h;
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
        }

        const updatedClient = await prisma.user.update({
            where: { id: clientId, role: 'CLIENT' },
            data: dataToUpdate,
            select: CLIENT_SELECT,
        });

        auditLog('CLIENT_UPDATED', session.userId, { clientId, fields: Object.keys(dataToUpdate) });

        return NextResponse.json(updatedClient);
    } catch (error: any) {
        console.error('PATCH /api/clients/[id] error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    // CSRF check
    if (!checkCsrf(req)) return csrfError();

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

        auditLog('CLIENT_DELETED', session.userId, { clientId });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE /api/clients/[id] error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
