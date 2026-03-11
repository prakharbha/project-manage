import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { signToken, setSession } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = signToken({
            userId: user.id,
            role: user.role,
            companyName: user.companyName,
            name: user.name || ''
        });

        await setSession(token);

        return NextResponse.json({ success: true, redirect: '/dashboard' });
    } catch (error) {
        console.error('Login error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
