"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    isAdmin: boolean;
}

export function CreateTaskModal({ isOpen, onClose, isAdmin }: CreateTaskModalProps) {
    const router = useRouter();
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        clientId: '',
        name: '',
        description: '',
        isPriority: false,
    });

    useEffect(() => {
        if (isOpen && isAdmin) {
            setIsLoading(true);
            fetch('/api/clients')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setClients(data);
                        if (data.length > 0) {
                            setFormData(prev => ({ ...prev, clientId: data[0].id }));
                        }
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, isAdmin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create task');
            }

            router.refresh(); // Tell Next.js Server Components to re-fetch
            onClose();
            setFormData({ clientId: isAdmin ? (clients[0]?.id || '') : '', name: '', description: '', isPriority: false });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center isolate">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm -z-10"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-border"
                    >
                        <div className="flex justify-between items-center p-6 border-b border-border bg-brand-50/50">
                            <h2 className="text-xl font-semibold text-brand-900">Create New Task</h2>
                            <button onClick={onClose} className="text-brand-400 hover:text-brand-600 transition-colors p-1 bg-white rounded-full hover:bg-brand-100">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            {error && (
                                <div className="mb-4 p-3 bg-danger/10 text-danger-dark rounded-lg border border-danger/20 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                {isAdmin && (
                                    <div>
                                        <label className="block text-sm font-medium text-brand-700 mb-1">
                                            Select Client <span className="text-danger">*</span>
                                        </label>
                                        {isLoading ? (
                                            <div className="h-10 border rounded-lg bg-brand-50 animate-pulse"></div>
                                        ) : (
                                            <select
                                                required
                                                value={formData.clientId}
                                                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                                className="w-full px-4 py-2 bg-white border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900"
                                            >
                                                <option value="" disabled>Select a client</option>
                                                {clients.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.companyName || c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-brand-700 mb-1">Task Title <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={100}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Design Login Page"
                                        className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900 placeholder:text-brand-300"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-brand-700 mb-1">Description</label>
                                    <textarea
                                        rows={3}
                                        maxLength={500}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Provide some details..."
                                        className="w-full px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900 placeholder:text-brand-300 resize-none"
                                    />
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer group mt-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isPriority}
                                        onChange={(e) => setFormData({ ...formData, isPriority: e.target.checked })}
                                        className="w-4 h-4 text-accent border-border rounded focus:ring-accent focus:ring-offset-1"
                                    />
                                    <span className="text-sm text-brand-700 font-medium group-hover:text-brand-900 transition-colors">Mark as Priority Task</span>
                                </label>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 border border-border text-brand-600 rounded-lg hover:bg-brand-50 transition-colors font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || (isAdmin && !formData.clientId) || !formData.name}
                                    className="flex-1 px-4 py-2 bg-brand-900 text-white rounded-lg hover:bg-brand-950 transition-colors font-medium text-sm flex items-center justify-center disabled:opacity-70"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
