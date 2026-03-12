import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Image from 'next/image';
import Link from 'next/link';
import { LogOut, LayoutDashboard, CheckSquare, Settings, User } from 'lucide-react';
import { NotificationDropdown } from '@/components/dashboard/NotificationDropdown';

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
                    <div className="flex items-center gap-2">
                        <div className="relative w-36 h-12 flex-shrink-0">
                            <Image src="/nandann-logo.png" alt="Nandann Logo" fill className="object-contain" priority />
                        </div>
                        <div className="flex items-center gap-1 -mt-[7px]">
                            <span className="font-bold text-2xl tracking-tight text-brand-900">G</span>
                            <div className="relative w-5 h-5 mt-1">
                                <Image src="/football.png" alt="O" fill className="object-contain" priority />
                            </div>
                            <span className="font-bold text-2xl tracking-tight text-brand-900">AL</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} active label="Dashboard" />
                    <NavItem href="/dashboard/tasks" icon={<CheckSquare size={20} />} label={isAdmin ? "All Tasks" : "Company Tasks"} />
                    {isAdmin && <NavItem href="/dashboard/clients" icon={<Settings size={20} />} label="Clients" />}
                    <NavItem href="/dashboard/settings" icon={<User size={20} />} label="Profile Settings" />
                </nav>

                <div className="p-4 mt-auto">
                    <Link href="/dashboard/settings" className="block mb-3">
                        <div className="bg-white border border-border/60 shadow-sm rounded-xl p-3 flex items-center gap-3 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-lg flex-shrink-0 shadow-inner">
                                {isAdmin ? 'A' : session.companyName?.[0] || 'C'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-brand-900 truncate">
                                    {session.name || 'User'}
                                </p>
                                <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-500 truncate mt-0.5">
                                    {isAdmin ? 'Nandann Internal' : session.companyName}
                                </p>
                            </div>
                        </div>
                    </Link>
                    <form action="/api/auth/logout" method="POST">
                        <button type="submit" className="w-full flex flex-row items-center justify-center gap-2 px-3 py-2 text-sm text-brand-600 hover:text-danger-dark hover:bg-danger/10 border border-transparent hover:border-danger/20 rounded-lg transition-all font-semibold">
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
                        <NotificationDropdown />
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
