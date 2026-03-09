"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { TaskDetailsModal } from '@/components/dashboard/modals/TaskDetailsModal';

export function ClientProjectList({ projects }: { projects: any[] }) {
    const [expandedId, setExpandedId] = useState<string | null>(projects[0]?.id || null);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-brand-100 text-brand-700';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
            case 'WAITING_ON_CLIENT': return 'bg-warning/20 text-warning-dark';
            case 'TESTING': return 'bg-indigo-100 text-indigo-700';
            case 'COMPLETED': return 'bg-success/20 text-success-dark';
            default: return 'bg-brand-100 text-brand-700';
        }
    };

    return (
        <>
            <div className="space-y-4">
                {projects.map(project => {
                    const isExpanded = expandedId === project.id;
                    const totalProjectHours = project.tasks.reduce((sum: number, task: any) => sum + task.billingHours, 0);
                    const completedTasks = project.tasks.filter((t: any) => t.status === 'COMPLETED').length;

                    return (
                        <motion.div
                            key={project.id}
                            initial={false}
                            animate={{ backgroundColor: isExpanded ? '#ffffff' : '#f9fafb' }}
                            className={`border border-border rounded-xl overflow-hidden transition-shadow ${isExpanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'}`}
                        >
                            {/* Project Header (Clickable) */}
                            <div
                                onClick={() => setExpandedId(isExpanded ? null : project.id)}
                                className="p-5 flex items-center justify-between cursor-pointer select-none"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-12 rounded-full ${project.status === 'ACTIVE' ? 'bg-success' : 'bg-brand-300'}`}></div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-brand-900">{project.name}</h3>
                                        <div className="flex items-center gap-3 text-sm text-brand-500 mt-1">
                                            <span className="flex items-center gap-1"><Clock size={14} /> {totalProjectHours}h Billed</span>
                                            <span className="bg-brand-200 w-1 h-1 rounded-full"></span>
                                            <span>{completedTasks} / {project.tasks.length} Tasks Done</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${project.status === 'ACTIVE' ? 'bg-success/10 text-success-dark' : 'bg-brand-100 text-brand-600'}`}>
                                        {project.status}
                                    </span>
                                    <button className="p-2 hover:bg-brand-100 rounded-full text-brand-500 transition-colors">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Task List View */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="border-t border-border bg-brand-50/50"
                                    >
                                        <div className="p-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-semibold text-brand-800 text-sm uppercase tracking-wider">Project Tasks</h4>
                                            </div>

                                            {project.tasks.length === 0 ? (
                                                <div className="text-center py-8 text-brand-400 text-sm">No tasks assigned to this project yet.</div>
                                            ) : (
                                                <div className="grid gap-3">
                                                    {project.tasks.map((task: any) => (
                                                        <div key={task.id} className={`bg-white border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-brand-300 ${task.isPriority ? 'border-l-4 border-l-warning' : 'border-border'}`}>

                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h5 className="font-semibold text-brand-900">{task.name}</h5>
                                                                    {task.isPriority && <span className="text-[10px] bg-warning/20 text-warning-dark font-bold px-1.5 py-0.5 rounded">PRIORITY</span>}
                                                                </div>
                                                                {task.description && <p className="text-sm text-brand-500 line-clamp-1">{task.description}</p>}
                                                            </div>

                                                            <div className="flex items-center gap-6 md:w-auto">
                                                                <div className="flex flex-col items-end">
                                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${getStatusColor(task.status)}`}>
                                                                        {task.status.replace(/_/g, ' ')}
                                                                    </span>
                                                                    {task.eta && (
                                                                        <span className="text-xs text-brand-400 mt-1 flex items-center gap-1">
                                                                            <Clock size={12} /> ETA: {new Date(task.eta).toLocaleDateString()}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="w-px h-8 bg-border hidden md:block"></div>

                                                                <div className="flex flex-col items-end min-w-[60px]">
                                                                    <span className="font-semibold text-brand-900">{task.billingHours}h</span>
                                                                    <span className="text-xs text-brand-400">Billed</span>
                                                                </div>

                                                                {/* Action: Open Comment Panel */}
                                                                <button
                                                                    onClick={() => setSelectedTask(task)}
                                                                    className="p-2 bg-brand-100 hover:bg-brand-200 text-brand-700 rounded-md transition-colors relative group"
                                                                >
                                                                    <MessageSquare size={16} />
                                                                    {task.comments && task.comments.length > 0 && (
                                                                        <span className="absolute -top-1.5 -right-1.5 bg-accent text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                                                                            {task.comments.length}
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            <TaskDetailsModal
                task={selectedTask}
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                isAdmin={false}
            />
        </>
    );
}
