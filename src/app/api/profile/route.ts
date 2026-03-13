import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { checkCsrf, csrfError, validatePassword } from '@/lib/security';

const MAX_BODY_BYTES = 64 * 1_024;

export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { name: true, email: true, notifyTaskUpdates: true, notifyComments: true, notifyBillingUpdates: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json(user);
    } catch (error: any) {
        console.error('GET /api/profile error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
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

        const { name, email, currentPassword, newPassword, notifyTaskUpdates, notifyComments, notifyBillingUpdates } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: session.userId } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const dataToUpdate: Record<string, unknown> = {};
        if (name !== undefined) dataToUpdate.name = String(name).trim().slice(0, 200);

        // If changing email, check it is not already taken by another user
        if (email !== undefined && email !== user.email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== session.userId) {
                return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });
            }
            dataToUpdate.email = String(email).trim();
        }

        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 });
            }

            // Enforce password strength before verifying current password (fail fast)
            const pwCheck = validatePassword(newPassword);
            if (!pwCheck.valid) {
                return NextResponse.json({ error: pwCheck.message }, { status: 400 });
            }

            const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isPasswordValid) {
                return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
            }

            dataToUpdate.passwordHash = await bcrypt.hash(newPassword, 12);
        }

        // Notification preferences
        if (notifyTaskUpdates !== undefined) dataToUpdate.notifyTaskUpdates = Boolean(notifyTaskUpdates);
        if (notifyComments !== undefined) dataToUpdate.notifyComments = Boolean(notifyComments);
        if (notifyBillingUpdates !== undefined) dataToUpdate.notifyBillingUpdates = Boolean(notifyBillingUpdates);

        if (Object.keys(dataToUpdate).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: session.userId },
            data: dataToUpdate
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('PATCH /api/profile error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
