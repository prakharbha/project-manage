import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardRootStore() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    // Next step: Check if user is Admin or Client and render respective components
    const isAdmin = session.role === 'ADMIN';

    return (
        <div className="space-y-6">
            {/* Metrics Row (Placeholders until DB is plugged) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Active Projects', value: '3', color: 'border-brand-500 text-brand-700' },
                    { label: isAdmin ? 'Total Pending Tasks' : 'Our Open Tasks', value: '12', color: 'border-accent text-accent-dark' },
                    { label: isAdmin ? 'Total Hours Billed' : 'Hours Billed', value: '45.5h', color: 'border-success text-success' },
                    { label: isAdmin ? 'Overdue Tasks' : 'Priority Tasks', value: '2', color: 'border-danger text-danger' },
                ].map((metric, idx) => (
                    <div key={idx} className={`glass-panel p-6 rounded-xl border-l-4 ${metric.color} flex flex-col justify-between`}>
                        <p className="text-sm font-medium text-brand-500 mb-2">{metric.label}</p>
                        <h3 className="text-3xl font-bold">{metric.value}</h3>
                    </div>
                ))}
            </div>

            <div className="glass-panel rounded-xl p-6 border border-border">
                <h2 className="text-lg font-semibold text-brand-900 mb-4">Recent Activity</h2>
                <div className="h-64 flex flex-col items-center justify-center text-brand-400">
                    {/* Replace with actual DB queries later */}
                    <p className="text-sm">Please set up PostgreSQL connection to view live data.</p>
                </div>
            </div>
        </div>
    );
}
