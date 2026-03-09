"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock } from 'lucide-react';

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const notifications = [
        { id: 1, text: "New task assigned: Design Mockups", time: "2 hours ago", unread: true },
        { id: 2, text: "Client commented on Website Redesign", time: "5 hours ago", unread: true },
        { id: 3, text: "Weekly progress report available", time: "1 day ago", unread: false }
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative ${isOpen ? 'bg-brand-100 text-brand-900' : 'hover:bg-brand-100 text-brand-600'}`}
            >
                <Bell size={20} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent"></span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50"
                    >
                        <div className="p-4 border-b border-border flex justify-between items-center bg-brand-50/50">
                            <h3 className="font-semibold text-brand-900">Notifications</h3>
                            <button className="text-xs text-brand-500 hover:text-brand-900 flex items-center gap-1 transition-colors">
                                <Check size={14} /> Mark all read
                            </button>
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length > 0 ? (
                                <ul className="divide-y divide-border">
                                    {notifications.map((notif) => (
                                        <li key={notif.id} className={`p-4 hover:bg-brand-50/50 transition-colors cursor-pointer ${notif.unread ? 'bg-accent/5' : ''}`}>
                                            <p className={`text-sm ${notif.unread ? 'font-medium text-brand-900' : 'text-brand-700'}`}>
                                                {notif.text}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1.5 text-xs text-brand-400">
                                                <Clock size={12} /> {notif.time}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-8 text-center text-brand-500">
                                    <Bell size={24} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">You have no new notifications.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-border text-center bg-brand-50/50">
                            <button className="text-sm font-medium text-accent hover:text-accent-dark transition-colors">
                                View all notifications
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
