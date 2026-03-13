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
    if (!session) redirect('/login');

    const isAdmin = session.role === 'ADMIN';

    return (
        <div className="min-h-screen bg-brand-50 font-sans">

            {/* ── DESKTOP SIDEBAR (md+) ── */}
            <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-border z-20 shadow-sm">
                <div className="px-6 pt-6 mb-8">
                    <div className="flex items-center gap-1">
                        <div className="relative w-28 h-9 flex-shrink-0">
                            <Image src="/nandann-logo.png" alt="Nandann Logo" fill className="object-contain" priority />
                        </div>
                        <div className="flex items-center gap-0 -mt-[7px]">
                            <span className="font-bold text-2xl leading-none tracking-tight text-brand-900">G</span>
                            <Image src="/football.png" alt="O" width={26} height={26} className="object-contain" style={{ marginTop: '2px' }} priority />
                            <span className="font-bold text-2xl leading-none tracking-tight text-brand-900">AL</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} active label="Dashboard" />
                    <NavItem href="/dashboard/tasks" icon={<CheckSquare size={20} />} label={isAdmin ? 'All Tasks' : 'Company Tasks'} />
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
                                <p className="text-sm font-bold text-brand-900 truncate">{session.name || 'User'}</p>
                                <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-500 truncate mt-0.5">
                                    {isAdmin ? 'Nandann Internal' : session.companyName}
                                </p>
                            </div>
                        </div>
                    </Link>
                    <form action="/api/auth/logout" method="POST">
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-brand-600 hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 rounded-lg transition-all font-semibold">
                            <LogOut size={16} /> Sign Out
                        </button>
                    </form>
                </div>
            </aside>

            {/* ── MAIN CONTENT AREA ── */}
            <div className="md:pl-64 flex flex-col md:h-screen md:overflow-hidden">

                {/* Header — logo on mobile, page title on desktop */}
                <header className="sticky top-0 z-10 h-14 md:h-16 bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-8 flex-shrink-0">
                    <div className="flex md:hidden items-center gap-1">
                        <div className="relative w-24 h-8 flex-shrink-0">
                            <Image src="/nandann-logo.png" alt="Nandann Logo" fill className="object-contain" priority />
                        </div>
                        <div className="flex items-center gap-0 -mt-[5px]">
                            <span className="font-bold text-xl leading-none tracking-tight text-brand-900">G</span>
                            <Image src="/football.png" alt="O" width={22} height={22} className="object-contain" style={{ marginTop: '2px' }} priority />
                            <span className="font-bold text-xl leading-none tracking-tight text-brand-900">AL</span>
                        </div>
                    </div>
                    <h1 className="hidden md:block text-xl font-semibold text-brand-900">
                        {isAdmin ? 'Admin Overview' : 'Project Overview'}
                    </h1>
                    <div className="flex items-center gap-3">
                        <NotificationDropdown />
                    </div>
                </header>

                {/* Page content — extra bottom padding on mobile for the bottom nav */}
                <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8 kanban-scroll relative">
                    {children}
                </main>
            </div>

            {/* ── MOBILE BOTTOM NAV (< md) ── */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-border z-20 flex items-stretch">
                <MobileNavItem href="/dashboard" icon={<LayoutDashboard size={22} />} label="Dashboard" />
                <MobileNavItem href="/dashboard/tasks" icon={<CheckSquare size={22} />} label="Tasks" />
                {isAdmin && <MobileNavItem href="/dashboard/clients" icon={<Settings size={22} />} label="Clients" />}
                <MobileNavItem href="/dashboard/settings" icon={<User size={22} />} label="Profile" />
                <form action="/api/auth/logout" method="POST" className="flex-1">
                    <button type="submit" className="w-full h-full flex flex-col items-center justify-center gap-1 text-brand-400 hover:text-danger transition-colors">
                        <LogOut size={22} />
                        <span className="text-[10px] font-medium">Sign Out</span>
                    </button>
                </form>
            </nav>

        </div>
    );
}

function NavItem({ href, icon, active, label }: { href: string; icon: React.ReactNode; active?: boolean; label: string }) {
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

function MobileNavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <a
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-brand-400 hover:text-brand-900 transition-colors"
        >
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
        </a>
    );
}
