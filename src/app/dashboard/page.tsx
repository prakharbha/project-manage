import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';

export default async function DashboardRootStore() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    const isAdmin = session.role === 'ADMIN';

    // Fetch real data based on role
    // Ensure we don't block the UI while loading the counts using Suspense or doing it all in parallel
    const [activeProjects, openTasks, billableData] = await Promise.all([
        prisma.project.count({
            where: isAdmin ? { status: 'ACTIVE' } : { clientId: session.userId, status: 'ACTIVE' }
        }),
        prisma.task.count({
            where: isAdmin ? { status: { not: 'COMPLETED' } } : { project: { clientId: session.userId }, status: { not: 'COMPLETED' } }
        }),
        isAdmin
            ? prisma.task.aggregate({ _sum: { billingHours: true } })
            : prisma.user.findUnique({ where: { id: session.userId }, select: { advanceHours: true, billedHours: true } })
    ]);

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

        const priorityCount = await prisma.task.count({ where: { project: { clientId: session.userId }, status: { not: 'COMPLETED' }, isPriority: true } });
        secondaryBillingMetric.label = 'Priority Tasks';
        secondaryBillingMetric.value = `${priorityCount}`;
        secondaryBillingMetric.color = 'border-warning text-warning';
    }

    return (
        <div className="space-y-6">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Active Projects', value: `${activeProjects}`, color: 'border-brand-500 text-brand-700' },
                    { label: isAdmin ? 'Total Pending Tasks' : 'Our Open Tasks', value: `${openTasks}`, color: 'border-accent text-accent-dark' },
                    primaryBillingMetric,
                    secondaryBillingMetric,
                ].map((metric, idx) => (
                    <div key={idx} className={`glass-panel p-6 rounded-xl border-l-4 ${metric.color} flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow`}>
                        <p className="text-sm font-medium text-brand-500 mb-2">{metric.label}</p>
                        <h3 className="text-3xl font-bold">{metric.value}</h3>
                    </div>
                ))}
            </div>

            <div className="glass-panel rounded-xl p-6 border border-border shadow-sm">
                <h2 className="text-lg font-semibold text-brand-900 mb-4">Recent Activity</h2>
                <div className="h-64 flex flex-col items-center justify-center text-brand-400">
                    <p className="text-sm italic">Detailed activity timelines coming soon.</p>
                </div>
            </div>
        </div>
    );
}
