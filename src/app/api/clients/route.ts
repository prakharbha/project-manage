import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, companyName, email, password } = await req.json();

        if (!email || !password || !companyName) {
            return NextResponse.json({ error: 'Email, Default Password, and Company Name are required' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'Client with this email already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newClient = await prisma.user.create({
            data: {
                name: name || '',
                companyName,
                email,
                passwordHash: hashedPassword,
                role: 'CLIENT',
                // Auto-create a default project so Admins can immediately assign tasks
                projects: {
                    create: [
                        { name: 'General Board', status: 'ACTIVE' }
                    ]
                }
            }
        });

        // Strip password hash from response
        const { passwordHash: _, ...clientData } = newClient;

        return NextResponse.json(clientData, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
