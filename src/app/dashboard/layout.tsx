import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { LogOut, LayoutDashboard, CheckSquare, Settings, Bell } from 'lucide-react';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    const isAdmin = session.role === 'ADMIN';

    return (
        <div className="min-h-screen bg-brand-50 flex flex-col md:flex-row font-sans">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 bg-white border-r border-border flex flex-col pt-6 z-10 shadow-sm relative">
                <div className="px-6 mb-8 flex items-center justify-between md:justify-start">
                    <div className="font-bold text-2xl tracking-tight text-brand-900 flex items-baseline gap-1">
                        <span className="bg-brand-900 text-white px-2 py-0.5 rounded text-xs font-medium tracking-widest uppercase relative -top-1">Nandann</span>
                        <span>OS<span className="text-accent">.</span></span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} active label="Dashboard" />
                    {isAdmin && <NavItem href="/dashboard/tasks" icon={<CheckSquare size={20} />} label="All Tasks" />}
                    {isAdmin && <NavItem href="/dashboard/clients" icon={<Settings size={20} />} label="Clients" />}
                </nav>

                <div className="p-4 border-t border-border bg-brand-50/50">
                    <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg truncate">
                        <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-semibold flex-shrink-0">
                            {isAdmin ? 'A' : session.companyName?.[0] || 'C'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-900 truncate">
                                {isAdmin ? 'Administrator' : session.companyName}
                            </p>
                            <p className="text-xs text-brand-500 truncate">{isAdmin ? 'Nandann Internal' : 'Client Portal'}</p>
                        </div>
                    </div>
                    <form action="/api/auth/logout" method="POST">
                        <button type="submit" className="w-full flex flex-row items-center gap-2 px-3 py-2 text-sm text-brand-600 hover:text-danger hover:bg-danger/10 rounded-md transition-colors font-medium">
                            <LogOut size={16} /> <span>Sign Out</span>
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0">
                    <h1 className="text-xl font-semibold text-brand-900">
                        {isAdmin ? 'Admin Overview' : 'Project Overview'}
                    </h1>
                    <div className="flex items-center gap-4">
                        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-brand-100 transition-colors text-brand-600 relative">
                            <Bell size={20} />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent"></span>
                        </button>
                    </div>
                </header>

                {/* Dynamic Page Content */}
                <div className="flex-1 overflow-auto p-4 md:p-8 kanban-scroll relative">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavItem({ href, icon, active, label }: { href: string, icon: React.ReactNode, active?: boolean, label: string }) {
    return (
        <a
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${active ? 'bg-accent text-white shadow-sm' : 'text-brand-600 hover:bg-brand-100 hover:text-brand-900'}`}
        >
            {icon}
            <span>{label}</span>
        </a>
    );
}
