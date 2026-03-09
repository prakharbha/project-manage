import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { Bell, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default async function NotificationsPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    const notifications = await prisma.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    const timeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-brand-900">Your Notifications</h2>
                        <p className="text-sm text-brand-500">Stay up to date with tasks and project activities.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-brand-400">
                        <Bell size={48} className="mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-brand-900 mb-1">All Caught Up</h3>
                        <p className="text-sm">You have no new notifications to review.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {notifications.map((notif) => (
                            <li key={notif.id} className={`p-5 transition-colors flex items-start gap-4 ${!notif.isRead ? 'bg-accent/5' : 'hover:bg-brand-50/50'}`}>
                                <div className="mt-1">
                                    {notif.isRead ? (
                                        <CheckCircle size={18} className="text-brand-300" />
                                    ) : (
                                        <div className="w-2.5 h-2.5 rounded-full bg-accent mt-1.5 ml-1"></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm ${!notif.isRead ? 'font-medium text-brand-900' : 'text-brand-700'}`}>
                                        {notif.message}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-brand-400 font-medium">
                                        <Clock size={12} /> {timeAgo(notif.createdAt)}
                                    </div>
                                    {notif.link && (
                                        <div className="mt-3">
                                            <Link href={notif.link} className="text-xs font-medium text-accent hover:text-accent-dark transition-colors border border-accent/20 bg-accent/5 px-3 py-1.5 rounded-md hover:bg-accent/10">
                                                View Details
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
