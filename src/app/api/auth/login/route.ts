import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { signToken, setSession } from '@/lib/auth';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/lib/rateLimit';
import { checkCsrf, csrfError } from '@/lib/security';

// 10 attempts per IP per 15 minutes
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 15 * 60 * 1_000;

export async function POST(req: Request) {
    // CSRF check
    if (!checkCsrf(req)) return csrfError();

    // Rate limiting
    const ip = getClientIp(req);
    const rl = checkRateLimit(`login:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

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
