import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { KanbanBoard } from '@/components/dashboard/KanbanBoard';
import { CreateTaskModalWrapper } from '@/components/dashboard/modals/CreateTaskModalWrapper';

export default async function AllTasksPage() {
    const session = await getSession();

    if (!session) {
        redirect('/dashboard');
    }

    const isAdmin = session.role === 'ADMIN';

    // Fetch tasks based on role
    const tasks = await prisma.task.findMany({
        where: isAdmin ? undefined : {
            clientId: session.userId
        },
        include: {
            client: true,
            comments: true,
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-border shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-brand-900">Task Management</h2>
                    <p className="text-sm text-brand-500">
                        {isAdmin ? 'Drag and drop tasks to update their status across all client projects.' : 'View the status of your company\'s tasks.'}
                    </p>
                </div>
                <CreateTaskModalWrapper isAdmin={isAdmin} />
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden kanban-scroll min-h-[600px]">
                {/* Pass raw data down to the interactive client component */}
                <KanbanBoard initialTasks={tasks} isAdmin={isAdmin} />
            </div>
        </div>
    );
}
