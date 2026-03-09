"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Star, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TaskDetailsModal } from '@/components/dashboard/modals/TaskDetailsModal';

export function AdminTaskCards({ tasks }: { tasks: any[] }) {
    const router = useRouter();
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [togglingPriority, setTogglingPriority] = useState<string | null>(null);

    const getCardStyles = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-brand-50 border-brand-200';
            case 'IN_PROGRESS': return 'bg-blue-50 border-blue-200';
            case 'WAITING_ON_CLIENT': return 'bg-warning/10 border-warning/30';
            case 'TESTING': return 'bg-indigo-50 border-indigo-200';
            case 'COMPLETED': return 'bg-success/10 border-success/30';
            default: return 'bg-brand-50 border-brand-200';
        }
    };

    const getStatusText = (status: string) => status.replace(/_/g, ' ');

    const togglePriority = async (e: React.MouseEvent, task: any) => {
        e.stopPropagation();
        if (togglingPriority === task.id) return;

        setTogglingPriority(task.id);
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPriority: !task.isPriority }),
            });

            if (res.ok) {
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to toggle priority", error);
        } finally {
            setTogglingPriority(null);
        }
    };

    if (tasks.length === 0) {
        return (
            <div className="p-8 text-center text-brand-500 border border-border rounded-xl bg-white shadow-sm">
                No active tasks found in the system.
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.map(task => {
                    const styles = getCardStyles(task.status);
                    const isPriority = task.isPriority;

                    return (
                        <motion.div
                            key={task.id}
                            whileHover={{ y: -2 }}
                            onClick={() => setSelectedTask(task)}
                            className={`p-5 rounded-xl border cursor-pointer transition-all shadow-sm hover:shadow-md flex flex-col justify-between h-48 relative ${styles}`}
                        >
                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={(e) => togglePriority(e, task)}
                                    disabled={togglingPriority === task.id}
                                    className={`p-1.5 rounded-full transition-colors ${isPriority ? 'text-warning bg-warning/20' : 'text-brand-400 hover:text-warning hover:bg-brand-100'} ${togglingPriority === task.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={isPriority ? "Remove Priority" : "Mark as Priority"}
                                >
                                    <Star size={18} className={isPriority ? "fill-warning" : ""} />
                                </button>
                            </div>

                            <div>
                                <div className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit bg-white/60 mb-3 text-brand-800 backdrop-blur-sm border border-black/5">
                                    {getStatusText(task.status)}
                                </div>
                                <h3 className="font-semibold text-brand-900 line-clamp-2 pr-10">{task.name}</h3>
                                {task.project && (
                                    <p className="text-xs text-brand-500 mt-1 line-clamp-1 font-medium">{task.project.name}</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 mt-4 border-t border-black/5 pt-3">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 w-full truncate">
                                    <Building size={12} className="text-brand-400 shrink-0" />
                                    <span className="truncate">{task.project?.client?.companyName || 'Unknown Client'}</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-medium text-brand-600">
                                    <div className="flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded backdrop-blur-sm">
                                        <Clock size={10} /> {task.billingHours}h
                                    </div>

                                    {task.eta && (
                                        <div className="flex items-center gap-1 bg-white/60 px-2 py-0.5 rounded backdrop-blur-sm">
                                            ETA: {new Date(task.eta).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <TaskDetailsModal
                task={selectedTask}
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                isAdmin={true}
            />
        </>
    );
}
