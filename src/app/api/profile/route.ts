import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { name, email, currentPassword, newPassword, notifyTaskUpdates, notifyComments, notifyBillingUpdates } = await req.json();

        const user = await prisma.user.findUnique({ where: { id: session.userId } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const dataToUpdate: any = {};
        if (name !== undefined) dataToUpdate.name = name;

        // If changing email, check if it's already taken by another user
        if (email !== undefined && email !== user.email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== session.userId) {
                return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });
            }
            dataToUpdate.email = email;
        }

        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 });
            }

            const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isPasswordValid) {
                return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
            }

            dataToUpdate.passwordHash = await bcrypt.hash(newPassword, 10);
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
