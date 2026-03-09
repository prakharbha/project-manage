import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { ClientProjectList } from '@/components/dashboard/client/ClientProjectList';
import { CreateTaskModalWrapper } from '@/components/dashboard/modals/CreateTaskModalWrapper';

export default async function ClientProjectsPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    const projects = await prisma.project.findMany({
        where: session.role === 'ADMIN' ? undefined : { clientId: session.userId },
        include: {
            client: true,
            tasks: {
                include: {
                    comments: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="h-full flex flex-col space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-border shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-brand-900">
                        {session.role === 'ADMIN' ? 'All Projects' : 'Your Projects'}
                    </h2>
                    <p className="text-sm text-brand-500">
                        {session.role === 'ADMIN' ? 'Manage and create projects for clients.' : 'View your active projects, tasks, and hours.'}
                    </p>
                </div>
                <button className="bg-brand-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-950 transition-colors shadow-sm">
                    + New Project
                </button>
            </div>

            <div className="flex-1">
                <ClientProjectList projects={projects} />
            </div>
            <CreateTaskModalWrapper isAdmin={session.role === 'ADMIN'} />
        </div>
    );
}
