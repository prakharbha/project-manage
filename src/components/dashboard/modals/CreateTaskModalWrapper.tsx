"use client";

import { useState } from 'react';
import { CreateTaskModal } from '@/components/dashboard/modals/CreateTaskModal';

export function CreateTaskModalWrapper({ isAdmin }: { isAdmin: boolean }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-brand-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-950 transition-colors shadow-sm"
            >
                + New Task
            </button>
            <CreateTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                isAdmin={isAdmin}
            />
        </>
    );
}
