import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { checkCsrf, csrfError, validatePassword, auditLog } from '@/lib/security';

const MAX_BODY_BYTES = 64 * 1_024; // 64 KB — more than enough for a client record

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const clients = await prisma.user.findMany({
            where: { role: 'CLIENT' },
            select: { id: true, name: true, companyName: true },
            orderBy: { companyName: 'asc' }
        });

        return NextResponse.json(clients);
    } catch (error: any) {
        console.error('GET /api/clients error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    // CSRF check
    if (!checkCsrf(req)) return csrfError();

    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Body size guard
        const contentLength = Number(req.headers.get('content-length') ?? 0);
        if (contentLength > MAX_BODY_BYTES) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
        }

        const { name, companyName, email, password } = await req.json();

        if (!email || !password || !companyName) {
            return NextResponse.json({ error: 'Email, Default Password, and Company Name are required' }, { status: 400 });
        }

        // Password strength
        const pwCheck = validatePassword(password);
        if (!pwCheck.valid) {
            return NextResponse.json({ error: pwCheck.message }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'Client with this email already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newClient = await prisma.user.create({
            data: {
                name: name || '',
                companyName,
                email,
                passwordHash: hashedPassword,
                role: 'CLIENT'
            },
            select: {
                id: true,
                name: true,
                companyName: true,
                email: true,
                role: true,
                advanceHours: true,
                billedHours: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        auditLog('CLIENT_CREATED', session.userId, { clientId: newClient.id, email: newClient.email });

        return NextResponse.json(newClient, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/clients error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
