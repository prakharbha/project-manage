"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function TaskDetailsModal({
    task,
    isOpen,
    onClose,
    isAdmin
}: {
    task: any | null,
    isOpen: boolean,
    onClose: () => void,
    isAdmin: boolean
}) {
    const router = useRouter();
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isUpdatingTask, setIsUpdatingTask] = useState(false);
    const [localComments, setLocalComments] = useState<any[]>([]);

    // Local state for admin edits
    const [billingHours, setBillingHours] = useState(task?.billingHours || 0);
    const [eta, setEta] = useState(task?.eta ? new Date(task.eta).toISOString().split('T')[0] : '');

    // Sync when task changes
    // Used for optimistic updates to avoid hydration flicker
    // Better approach is to use React 19 `useOptimistic`, but sticking to safe state here.

    if (!task) return null;

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        setIsSubmittingComment(true);
        try {
            const res = await fetch(`/api/tasks/${task.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentText }),
            });

            if (res.ok) {
                const newComment = await res.json();
                setLocalComments([...localComments, newComment]);
                setCommentText('');
                router.refresh();
            }
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleSaveEdits = async () => {
        if (!isAdmin) return;
        setIsUpdatingTask(true);

        try {
            await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    billingHours: parseFloat(billingHours as any),
                    eta: eta ? new Date(eta).toISOString() : null,
                    status: task.status // Include current status to avoid overriding with null
                }),
            });
            router.refresh();
            onClose();
        } finally {
            setIsUpdatingTask(false);
        }
    };

    const displayComments = [...task.comments, ...localComments.filter(lc => !task.comments.find((tc: any) => tc.id === lc.id))];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
                        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-border"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-border bg-brand-50/50 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-200 text-brand-800 tracking-wide uppercase">
                                        {task.project.client.companyName}
                                    </span>
                                    {task.isPriority && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warning/20 text-warning-dark">
                                            PRIORITY
                                        </span>
                                    )}
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-600">
                                        {task.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-brand-900 leading-tight">{task.name}</h2>
                                <p className="text-sm text-brand-500 mt-1">{task.project.name}</p>
                            </div>
                            <button onClick={onClose} className="p-1.5 bg-white border border-border rounded-full hover:bg-brand-50 text-brand-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Scrollable Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 kanban-scroll">

                            {/* Description & Edits */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-4">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-2">Description</h4>
                                        <div className="bg-brand-50 p-4 rounded-lg text-sm text-brand-800 whitespace-pre-wrap border border-brand-100/50">
                                            {task.description || <span className="text-brand-400 italic">No description provided.</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Metadata Panel */}
                                <div className="space-y-4 bg-white border border-border rounded-xl p-4 shadow-sm h-fit">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-3 border-b pb-2">Task Details</h4>

                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-medium text-brand-600 mb-1">
                                            <Clock size={14} /> Billed Hours
                                        </label>
                                        {isAdmin ? (
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={billingHours}
                                                onChange={(e) => setBillingHours(e.target.value)}
                                                className="w-full text-sm px-3 py-1.5 border rounded-md focus:ring-1 focus:ring-accent outline-none"
                                            />
                                        ) : (
                                            <p className="font-semibold text-brand-900 text-sm bg-brand-50 px-3 py-1.5 rounded-md border">{task.billingHours}h</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-medium text-brand-600 mb-1">
                                            <AlertCircle size={14} /> ETA Date
                                        </label>
                                        {isAdmin ? (
                                            <input
                                                type="date"
                                                value={eta}
                                                onChange={(e) => setEta(e.target.value)}
                                                className="w-full text-sm px-3 py-1.5 border rounded-md focus:ring-1 focus:ring-accent outline-none"
                                            />
                                        ) : (
                                            <p className="font-semibold text-brand-900 text-sm bg-brand-50 px-3 py-1.5 rounded-md border">
                                                {task.eta ? new Date(task.eta).toLocaleDateString() : 'TBD'}
                                            </p>
                                        )}
                                    </div>

                                    {isAdmin && (
                                        <button
                                            onClick={handleSaveEdits}
                                            disabled={isUpdatingTask}
                                            className="w-full mt-4 bg-brand-100 hover:bg-brand-200 text-brand-800 text-xs font-semibold py-2 rounded-md transition-colors flex justify-center items-center"
                                        >
                                            {isUpdatingTask ? <Loader2 size={14} className="animate-spin" /> : 'Save Details'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div className="border-t border-border pt-6">
                                <h4 className="text-sm font-bold text-brand-900 mb-4 flex items-center gap-2">
                                    Discussion <span className="bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full text-xs">{displayComments.length}</span>
                                </h4>

                                <div className="space-y-4 mb-6">
                                    {displayComments.length === 0 ? (
                                        <p className="text-sm text-brand-400 text-center py-4 border border-dashed rounded-lg bg-brand-50/50">No comments yet. Start the conversation!</p>
                                    ) : (
                                        displayComments.map((comment: any, idx: number) => {
                                            const isMyComment = (isAdmin && comment.user?.role === 'ADMIN') || (!isAdmin && comment.user?.id === task.project.clientId);

                                            return (
                                                <div key={comment.id || idx} className={`flex flex-col ${isMyComment ? 'items-end' : 'items-start'}`}>
                                                    <div className="flex items-baseline gap-2 mb-1 px-1">
                                                        <span className="text-xs font-semibold text-brand-700">
                                                            {comment.user?.name || (comment.user?.role === 'ADMIN' ? 'Nandann Admin' : 'Client')}
                                                        </span>
                                                        <span className="text-[10px] text-brand-400">
                                                            {comment.createdAt ? new Date(comment.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'Just now'}
                                                        </span>
                                                    </div>
                                                    <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm ${isMyComment ? 'bg-brand-900 text-white rounded-br-sm' : 'bg-white border text-brand-800 rounded-bl-sm'}`}>
                                                        {comment.content}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                {/* Comment Input */}
                                <form onSubmit={handleCommentSubmit} className="relative">
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Type a message..."
                                        className="w-full border border-border rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-all resize-none bg-brand-50/30"
                                        rows={2}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSubmittingComment || !commentText.trim()}
                                        className="absolute right-3 bottom-3 p-2 bg-brand-900 text-white rounded-lg hover:bg-accent hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-brand-900"
                                    >
                                        {isSubmittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    </button>
                                </form>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
