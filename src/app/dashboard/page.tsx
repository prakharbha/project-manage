import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { Activity, MessageSquare, Briefcase, PlusCircle, CheckCircle2 } from 'lucide-react';
import { ClientTaskCards } from '@/components/dashboard/client/ClientTaskCards';
import { CreateTaskModalWrapper } from '@/components/dashboard/modals/CreateTaskModalWrapper';

// Date formatter
function timeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "just now";
}

export default async function DashboardRootStore() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    const isAdmin = session.role === 'ADMIN';

    const [activeProjects, openTasks, billableData, recentTasks, recentComments, recentProjects] = await Promise.all([
        prisma.project.count({
            where: isAdmin ? { status: 'ACTIVE' } : { clientId: session.userId, status: 'ACTIVE' }
        }),
        prisma.task.count({
            where: isAdmin ? { status: { not: 'COMPLETED' } } : { project: { clientId: session.userId }, status: { not: 'COMPLETED' } }
        }),
        isAdmin
            ? prisma.task.aggregate({ _sum: { billingHours: true } })
            : prisma.user.findUnique({ where: { id: session.userId }, select: { advanceHours: true, billedHours: true } }),

        // Activity Feed & Task Queries
        prisma.task.findMany({
            where: isAdmin ? undefined : { project: { clientId: session.userId }, status: { not: 'COMPLETED' } },
            orderBy: { createdAt: 'desc' },
            take: isAdmin ? 5 : 20, // Fetch more for the client card grid
            include: { project: { select: { name: true } } }
        }),
        prisma.comment.findMany({
            where: isAdmin ? undefined : { task: { project: { clientId: session.userId } } },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { user: { select: { name: true } }, task: { select: { name: true } } }
        }),
        prisma.project.findMany({
            where: isAdmin ? undefined : { clientId: session.userId },
            orderBy: { createdAt: 'desc' },
            take: 5
        })
    ]);

    // Unified Activity Array Assembly
    const activities = [
        ...recentTasks.map(t => ({
            id: `task-${t.id}`,
            type: 'task',
            title: `Task Created: ${t.name}`,
            subtitle: `In project: ${t.project.name}`,
            timestamp: t.createdAt,
            status: t.status
        })),
        ...recentComments.map(c => ({
            id: `comment-${c.id}`,
            type: 'comment',
            title: `${c.user.name || 'A user'} commented on ${c.task.name}`,
            subtitle: `"${c.content.length > 50 ? c.content.substring(0, 50) + '...' : c.content}"`,
            timestamp: c.createdAt,
            status: 'neutral'
        })),
        ...recentProjects.map(p => ({
            id: `project-${p.id}`,
            type: 'project',
            title: `New Project Started: ${p.name}`,
            subtitle: `Status: ${p.status}`,
            timestamp: p.createdAt,
            status: 'success'
        }))
    ]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 8);

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

            {isAdmin ? (
                <div className="glass-panel rounded-xl p-6 border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="text-brand-500" size={20} />
                        <h2 className="text-lg font-semibold text-brand-900">Recent Activity</h2>
                    </div>

                    {activities.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-brand-400">
                            <p className="text-sm italic">No recent activity detected.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                            {activities.map((activity) => {
                                let Icon = PlusCircle;
                                let iconBg = 'bg-brand-100 text-brand-600';

                                if (activity.type === 'comment') {
                                    Icon = MessageSquare;
                                    iconBg = 'bg-accent/10 text-accent';
                                } else if (activity.type === 'project') {
                                    Icon = Briefcase;
                                    iconBg = 'bg-success/10 text-success-dark';
                                }

                                return (
                                    <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <div className={`w-full h-full rounded-full flex items-center justify-center ${iconBg}`}>
                                                <Icon size={16} />
                                            </div>
                                        </div>

                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-semibold text-brand-900 text-sm">{activity.title}</h4>
                                                <span className="text-xs text-brand-500 font-medium">{timeAgo(activity.timestamp)}</span>
                                            </div>
                                            <p className="text-sm text-brand-600 truncate">{activity.subtitle}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
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
            )}
        </div>
    );
}
