"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Building, Edit2, X, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AdminClientTable({ initialClients }: { initialClients: any[] }) {
    const router = useRouter();
    const [clients, setClients] = useState(initialClients);
    const [editingClient, setEditingClient] = useState<any | null>(null);
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [createError, setCreateError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form state matching the edit modal
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        email: '',
        advanceHours: 0,
        billedHours: 0,
        password: ''
    });

    const openEditModal = (client: any) => {
        setFormData({
            name: client.name || '',
            companyName: client.companyName || '',
            email: client.email || '',
            advanceHours: client.advanceHours || 0,
            billedHours: client.billedHours || 0,
            password: ''
        });
        setEditingClient(client);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClient) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/clients/${editingClient.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const updatedClient = await res.json();
                setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
                router.refresh();
                setEditingClient(null);
            } else {
                const errData = await res.json();
                console.error("Error updating client:", errData.error);
            }
        } catch (error) {
            console.error("Failed to update client:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        setIsSaving(true);
        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const newClient = await res.json();
                setClients(prev => [newClient, ...prev]);
                router.refresh();
                setIsCreatingClient(false);
            } else {
                const errData = await res.json();
                setCreateError(errData.error || 'Failed to create client');
            }
        } catch (error) {
            setCreateError('An unexpected error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    const openCreateModal = () => {
        setFormData({ name: '', companyName: '', email: '', advanceHours: 0, billedHours: 0, password: '' });
        setIsCreatingClient(true);
    };

    const handleDelete = async (clientId: string, companyName: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete ${companyName || 'this client'} and all their associated tasks? This action CANNOT be undone.`)) {
            return;
        }

        setDeletingId(clientId);
        try {
            const res = await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setClients(prev => prev.filter(c => c.id !== clientId));
                router.refresh();
            } else {
                const errData = await res.json();
                alert(errData.error || 'Failed to delete client');
            }
        } catch (error) {
            console.error('Failed to delete client:', error);
            alert('An unexpected error occurred while deleting.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-4 flex-1">
            <div className="flex justify-end">
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-brand-900 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-brand-950 transition-all shadow-sm active:scale-95"
                >
                    + New Client
                </button>
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
                                    <th className="px-6 py-4 text-xs font-semibold text-brand-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {clients.map(client => (
                                    <tr key={client.id} className="hover:bg-brand-50/30 transition-colors group">
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
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(client)}
                                                    className="p-1.5 text-brand-400 hover:text-accent hover:bg-accent/10 rounded transition-colors"
                                                    title="Edit Client"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(client.id, client.companyName)}
                                                    disabled={deletingId === client.id}
                                                    className="p-1.5 text-danger-dark/50 hover:text-danger hover:bg-danger/10 rounded transition-colors disabled:opacity-50"
                                                    title="Delete Client"
                                                >
                                                    {deletingId === client.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Edit Modal */}
                <AnimatePresence>
                    {editingClient && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center isolate p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm -z-10"
                                onClick={() => setEditingClient(null)}
                            />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-border"
                            >
                                <div className="flex justify-between items-center p-6 border-b border-border bg-brand-50/50">
                                    <h2 className="text-xl font-semibold text-brand-900">Edit Client Details</h2>
                                    <button onClick={() => setEditingClient(null)} className="text-brand-400 hover:text-brand-600 transition-colors p-1 bg-white rounded-full hover:bg-brand-100">
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSave} className="p-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-brand-700 mb-1">Company Name</label>
                                            <input
                                                type="text"
                                                value={formData.companyName}
                                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                                placeholder="e.g. Acme Corp"
                                                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-brand-700 mb-1">Advance Hours</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={formData.advanceHours}
                                                    onChange={(e) => setFormData({ ...formData, advanceHours: Number(e.target.value) })}
                                                    className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-brand-700 mb-1">Billed Hours</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={formData.billedHours}
                                                    onChange={(e) => setFormData({ ...formData, billedHours: Number(e.target.value) })}
                                                    className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-brand-700 mb-1">Contact Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-brand-700 mb-1">Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setEditingClient(null)}
                                            className="flex-1 px-4 py-2 border border-border text-brand-600 rounded-lg hover:bg-brand-50 transition-colors font-medium text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="flex-1 px-4 py-2 bg-brand-900 text-white rounded-lg hover:bg-brand-950 transition-colors font-medium text-sm flex items-center justify-center disabled:opacity-70"
                                        >
                                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Create Client Modal */}
                <AnimatePresence>
                    {isCreatingClient && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center isolate p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm -z-10"
                                onClick={() => setIsCreatingClient(false)}
                            />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-border"
                            >
                                <div className="flex justify-between items-center p-6 border-b border-border bg-brand-50/50">
                                    <h2 className="text-xl font-semibold text-brand-900">Add New Client</h2>
                                    <button onClick={() => setIsCreatingClient(false)} className="text-brand-400 hover:text-brand-600 transition-colors p-1 bg-white rounded-full hover:bg-brand-100">
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreate} className="p-6">
                                    {createError && (
                                        <div className="mb-4 p-3 bg-danger/10 text-danger-dark rounded-lg border border-danger/20 text-sm">
                                            {createError}
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-brand-700 mb-1">Company Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.companyName}
                                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                                placeholder="e.g. Acme Corp"
                                                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-brand-700 mb-1">Contact Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g. John Doe"
                                                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-brand-700 mb-1">Email Address *</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="client@company.com"
                                                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-brand-700 mb-1">Temporary Password *</label>
                                            <input
                                                type="password"
                                                required
                                                minLength={6}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="Set initial password..."
                                                className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingClient(false)}
                                            className="flex-1 px-4 py-2 border border-border text-brand-600 rounded-lg hover:bg-brand-50 transition-colors font-medium text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="flex-1 px-4 py-2 bg-brand-900 text-white rounded-lg hover:bg-brand-950 transition-colors font-medium text-sm flex items-center justify-center disabled:opacity-70"
                                        >
                                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Create Client'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
