import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/lib/rateLimit';
import { checkCsrf, csrfError, validatePassword } from '@/lib/security';

// 5 attempts per IP per hour
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1_000;

export async function POST(req: Request) {
    // CSRF check
    if (!checkCsrf(req)) return csrfError();

    // Rate limiting
    const ip = getClientIp(req);
    const rl = checkRateLimit(`reset-password:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
        }

        // Enforce password strength before any DB work
        const pwCheck = validatePassword(password);
        if (!pwCheck.valid) {
            return NextResponse.json({ error: pwCheck.message }, { status: 400 });
        }

        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
        }

        // Hash with cost factor 12 and clear the token atomically
        const hashedPassword = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                resetToken: null,          // one-time use: invalidate immediately
                resetTokenExpiry: null,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Reset password error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
