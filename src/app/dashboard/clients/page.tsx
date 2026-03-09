import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { AdminClientTable } from '@/components/dashboard/admin/AdminClientTable';

export default async function ClientsPage() {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const clients = await prisma.user.findMany({
        where: { role: 'CLIENT' },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="h-full flex flex-col space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-border shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-brand-900">
                        Client Management
                    </h2>
                    <p className="text-sm text-brand-500">
                        Manage all registered clients and their corporate details.
                    </p>
                </div>
            </div>

            <AdminClientTable initialClients={clients} />
        </div>
    );
}
