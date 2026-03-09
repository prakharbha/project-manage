import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { Mail, Building } from 'lucide-react';

export default async function ClientsPage() {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const clients = await prisma.user.findMany({
        where: { role: 'CLIENT' },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="h-full flex flex-col space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-border shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-brand-900">
                        Client Management
                    </h2>
                    <p className="text-sm text-brand-500">
                        Manage all registered clients and their corporate details.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex-1">
                {clients.length === 0 ? (
                    <div className="p-12 text-center text-brand-500">
                        <p>No clients registered yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-brand-50/50">
                                    <th className="px-6 py-4 text-xs font-semibold text-brand-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-brand-500 uppercase tracking-wider">Company</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-brand-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-brand-500 uppercase tracking-wider text-right">Hours (Adv / Billed)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {clients.map(client => (
                                    <tr key={client.id} className="hover:bg-brand-50/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-brand-900">{client.name || 'N/A'}</div>
                                            <div className="text-xs text-brand-500">Joined {new Date(client.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-brand-700">
                                                <Building size={14} className="text-brand-400" />
                                                {client.companyName || 'No Company'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-brand-600">
                                                <Mail size={14} className="text-brand-400" />
                                                <a href={`mailto:${client.email}`} className="hover:text-accent transition-colors">{client.email}</a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-3 text-sm font-medium">
                                                <span className="text-success-dark bg-success/10 px-2 py-0.5 rounded" title="Advance Hours">{client.advanceHours}h</span>
                                                <span className="text-danger-dark bg-danger/10 px-2 py-0.5 rounded" title="Billed Hours">{client.billedHours}h</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
