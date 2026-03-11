import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export async function GET(req: Request) {
    try {
        // Only allow seed in dev or if explicitly enabled
        if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
            return NextResponse.json({ error: 'Seed disabled in production' }, { status: 403 });
        }

        // Check if admin already exists
        const existingAdmin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (existingAdmin) {
            return NextResponse.json({ message: 'Admin already exists, skipping seed' });
        }

        const passwordHash = await bcrypt.hash('password123', 10);

        // Create Admin
        const admin = await prisma.user.create({
            data: {
                email: 'prakhar@nandann.com',
                passwordHash,
                name: 'Admin User',
                role: 'ADMIN',
            }
        });

        // Create a Client
        const client = await prisma.user.create({
            data: {
                email: 'client@example.com',
                passwordHash,
                name: 'Example Client',
                role: 'CLIENT',
                companyName: 'Acme Corp',
                advanceHours: 10,
                billedHours: 2,
            }
        });

        // Create Tasks
        await prisma.task.create({
            data: {
                clientId: client.id,
                name: 'Design Mockups',
                status: 'COMPLETED',
                billingHours: 2
            }
        });

        await prisma.task.create({
            data: {
                clientId: client.id,
                name: 'Develop Navigation',
                status: 'IN_PROGRESS',
                isPriority: true,
                eta: new Date(Date.now() + 86400000) // tomorrow
            }
        });

        return NextResponse.json({ success: true, message: 'Database seeded successfully', accounts: { admin: 'prakhar@nandann.com', client: 'client@example.com', password: 'password123' } });

    } catch (error) {
        console.error('Seed error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
