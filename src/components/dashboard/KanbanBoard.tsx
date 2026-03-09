"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TaskDetailsModal } from '@/components/dashboard/modals/TaskDetailsModal';

// Defined matching Prisma Enums
const COLUMNS = [
    { id: 'PENDING', label: 'Pending', color: 'bg-kanban-pending border-brand-200' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-kanban-progress border-blue-200' },
    { id: 'WAITING_ON_CLIENT', label: 'Waiting for Input', color: 'bg-kanban-waiting border-yellow-300' },
    { id: 'TESTING', label: 'Under Testing', color: 'bg-kanban-testing border-indigo-200' },
    { id: 'COMPLETED', label: 'Completed', color: 'bg-kanban-completed border-green-200' }
];

export function KanbanBoard({ initialTasks }: { initialTasks: any[] }) {
    const [tasks, setTasks] = useState(initialTasks);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedTaskId(id);
        e.dataTransfer.effectAllowed = "move";
        // Adding slight transparency to dragging object natively via empty drag image
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: React.DragEvent, statusId: string) => {
        e.preventDefault();
        if (!draggedTaskId) return;

        // Optimistically update
        const previousTasks = [...tasks];
        setTasks(tasks.map(t => t.id === draggedTaskId ? { ...t, status: statusId } : t));

        // Server hook point later
        try {
            /* await fetch(/api/tasks/status)... */
        } catch {
            // Revert on fail
            setTasks(previousTasks);
        }

        setDraggedTaskId(null);
    };

    return (
        <div className="flex gap-4 h-full pb-4 items-stretch">
            {COLUMNS.map(col => (
                <div
                    key={col.id}
                    className={`flex-shrink-0 w-80 rounded-xl overflow-hidden flex flex-col border ${col.color} bg-white/50`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                >
                    {/* Column Header */}
                    <div className={`p-4 font-semibold text-brand-900 border-b flex justify-between items-center ${col.color.split(' ')[0]}`}>
                        <span>{col.label}</span>
                        <span className="text-xs font-medium bg-white/60 px-2 py-0.5 rounded-full text-brand-700">
                            {tasks.filter(t => t.status === col.id).length}
                        </span>
                    </div>

                    {/* Cards Container */}
                    <div className="flex-1 overflow-y-auto kanban-scroll p-3 space-y-3">
                        {tasks.filter(t => t.status === col.id).map(task => (
                            <KanbanCard
                                key={task.id}
                                task={task}
                                isDragging={draggedTaskId === task.id}
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onClick={() => setSelectedTask(task)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <TaskDetailsModal
                task={selectedTask}
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                isAdmin={true}
            />
        </div>
    );
}

function KanbanCard({ task, isDragging, onDragStart, onClick }: { task: any, isDragging: boolean, onDragStart: (e: React.DragEvent) => void, onClick: () => void }) {
    return (
        <motion.div
            layoutId={task.id}
            draggable
            onDragStart={(e: any) => onDragStart(e)}
            onClick={onClick}
            onDragEnd={(e) => e.preventDefault()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`bg-white border p-4 rounded-lg cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow ${isDragging ? 'opacity-40 border-dashed border-brand-400 border-2 shadow-none' : 'border-border'} ${task.isPriority ? 'border-l-4 border-l-warning' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-brand-500 uppercase tracking-wider truncate mr-2">
                    {task.project.client.companyName}
                </span>
                {task.isPriority && (
                    <span className="text-[10px] bg-warning/20 text-warning-dark font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                        PRIORITY
                    </span>
                )}
            </div>

            <h4 className="font-semibold text-brand-900 text-sm mb-1 leading-snug">{task.name}</h4>
            <p className="text-xs text-brand-500 line-clamp-2 mb-3 leading-relaxed">
                {task.project.name}
            </p>

            <div className="flex justify-between items-center text-xs text-brand-400 mt-2 border-t pt-2 border-border/50">
                <div className="flex items-center gap-1">
                    <span className="bg-brand-50 px-1.5 py-0.5 rounded text-brand-600 font-medium">
                        {task.billingHours}h
                    </span>
                </div>
                <div className="flex items-center gap-1 hover:text-brand-600 transition-colors">
                    <span className="flex items-center gap-1 cursor-pointer">
                        💬 {task.comments.length}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
