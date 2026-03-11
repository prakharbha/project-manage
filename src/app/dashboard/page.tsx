import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { CheckCircle2 } from 'lucide-react';
import { ClientTaskCards } from '@/components/dashboard/client/ClientTaskCards';
import { CreateTaskModalWrapper } from '@/components/dashboard/modals/CreateTaskModalWrapper';
import { AdminTaskCards } from '@/components/dashboard/admin/AdminTaskCards';

// Date formatter removed. Not needed anywhere else.

export default async function DashboardRootStore() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    const isAdmin = session.role === 'ADMIN';

    const [activeClients, openTasks, billableData, recentTasks, recentComments, completedTasks] = await Promise.all([
        isAdmin ? prisma.user.count({ where: { role: 'CLIENT' } }) : Promise.resolve(0),
        prisma.task.count({
            where: isAdmin ? { status: { not: 'COMPLETED' } } : { clientId: session.userId, status: { not: 'COMPLETED' } }
        }),
        isAdmin
            ? prisma.task.aggregate({ _sum: { billingHours: true } })
            : prisma.user.findUnique({ where: { id: session.userId }, select: { advanceHours: true, billedHours: true } }),

        // Activity Feed & Task Queries
        prisma.task.findMany({
            where: isAdmin ? undefined : { clientId: session.userId, status: { not: 'COMPLETED' } },
            orderBy: { createdAt: 'desc' },
            take: 20, // Increased to support proper grid for both Admin & Client
            include: {
                client: {
                    select: {
                        companyName: true,
                        name: true
                    }
                },
                comments: {
                    include: { user: { select: { id: true, name: true, role: true } } }
                }
            }
        }),
        prisma.comment.findMany({
            where: isAdmin ? undefined : { task: { clientId: session.userId } },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { user: { select: { name: true } }, task: { select: { name: true } } }
        }),
        isAdmin ? Promise.resolve([]) : prisma.task.findMany({
            where: { clientId: session.userId, status: 'COMPLETED' },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            include: {
                client: { select: { companyName: true, name: true } },
                comments: { include: { user: { select: { id: true, name: true, role: true } } } }
            }
        })
    ]);

    // Clean up generic Feed code since Admin also uses Cards now.
    // Commented out activity assembler block and date formatter since they're no longer needed on this file entirely.

    let primaryBillingMetric = { label: 'Hours Billed', value: '0h', color: 'border-success text-success' };
    let secondaryBillingMetric = { label: 'Overdue Tasks', value: '0', color: 'border-danger text-danger' };

    if (isAdmin) {
        primaryBillingMetric.value = `${(billableData as any)?._sum?.billingHours || 0}h`;
        const overdueCount = await prisma.task.count({ where: { status: { not: 'COMPLETED' }, eta: { lt: new Date() } } });
        secondaryBillingMetric.value = `${overdueCount}`;
    } else {
        const clientData = billableData as { advanceHours: number, billedHours: number };
        const remaining = (clientData?.advanceHours || 0) - (clientData?.billedHours || 0);

        if (remaining >= 0) {
            primaryBillingMetric.label = 'Hours Remaining';
            primaryBillingMetric.value = `${remaining}h`;
            primaryBillingMetric.color = 'border-info text-info';
        } else {
            primaryBillingMetric.label = 'Hours Overdue';
            primaryBillingMetric.value = `${Math.abs(remaining)}h`;
            primaryBillingMetric.color = 'border-danger text-danger';
        }

        const priorityCount = await prisma.task.count({ where: { clientId: session.userId, status: { not: 'COMPLETED' }, isPriority: true } });
        secondaryBillingMetric.label = 'Priority Tasks';
        secondaryBillingMetric.value = `${priorityCount}`;
        secondaryBillingMetric.color = 'border-warning text-warning';
    }

    return (
        <div className="space-y-6">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    isAdmin ? { label: 'Total Clients', value: `${activeClients}`, color: 'border-brand-500 text-brand-700' } : null,
                    { label: isAdmin ? 'Total Pending Tasks' : 'Our Open Tasks', value: `${openTasks}`, color: 'border-accent text-accent-dark' },
                    primaryBillingMetric,
                    secondaryBillingMetric,
                ].filter(Boolean).map((metric: any, idx) => (
                    <div key={idx} className={`glass-panel p-6 rounded-xl border-l-4 ${metric.color} flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow`}>
                        <p className="text-sm font-medium text-brand-500 mb-2">{metric.label}</p>
                        <h3 className="text-3xl font-bold">{metric.value}</h3>
                    </div>
                ))}
            </div>

            {isAdmin ? (
                <div className="glass-panel rounded-xl p-6 border border-border shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="text-brand-500" size={20} />
                            <h2 className="text-lg font-semibold text-brand-900">Task Overview</h2>
                        </div>
                        <CreateTaskModalWrapper isAdmin={true} />
                    </div>

                    <AdminTaskCards tasks={recentTasks} />
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    <div className="glass-panel rounded-xl p-6 border border-border shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="text-brand-500" size={20} />
                                <h2 className="text-lg font-semibold text-brand-900">Your Open Tasks</h2>
                            </div>
                            <CreateTaskModalWrapper isAdmin={false} />
                        </div>

                        <ClientTaskCards tasks={recentTasks} />
                    </div>

                    <div className="glass-panel rounded-xl p-6 border border-border shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="text-brand-500" size={20} />
                                <h2 className="text-lg font-semibold text-brand-900">Completed Tasks</h2>
                            </div>
                        </div>

                        {completedTasks.length > 0 ? (
                            <ClientTaskCards tasks={completedTasks} />
                        ) : (
                            <div className="text-sm text-brand-500 text-center italic py-4">No completed tasks yet.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
