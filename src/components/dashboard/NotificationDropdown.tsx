"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock } from 'lucide-react';

import { useRouter } from 'next/navigation';

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Optional: set up interval to poll for new ones, e.g. every 60s
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

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

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (id: string) => {
        try {
            const res = await fetch(`/api/notifications/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: true })
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            }
        } catch (error) {
            console.error("Error marking as read", error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const res = await fetch('/api/notifications/read-all', { method: 'POST' });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            }
        } catch (error) {
            console.error("Error marking all as read", error);
        }
    };

    // Simple time ago formatter
    const timeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative ${isOpen ? 'bg-brand-100 text-brand-900' : 'hover:bg-brand-100 text-brand-600'}`}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 outline outline-2 outline-white rounded-full bg-accent"></span>
                )}
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
                            <h3 className="font-semibold text-brand-900">Notifications {unreadCount > 0 && `(${unreadCount})`}</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-brand-500 hover:text-brand-900 flex items-center gap-1 transition-colors"
                                >
                                    <Check size={14} /> Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length > 0 ? (
                                <ul className="divide-y divide-border">
                                    {notifications.map((notif) => (
                                        <li
                                            key={notif.id}
                                            onClick={() => {
                                                if (!notif.isRead) handleMarkAsRead(notif.id);
                                                if (notif.link) router.push(notif.link);
                                                setIsOpen(false);
                                            }}
                                            className={`p-4 hover:bg-brand-50/50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-accent/5' : ''}`}
                                        >
                                            <p className={`text-sm ${!notif.isRead ? 'font-medium text-brand-900' : 'text-brand-700'}`}>
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1.5 text-xs text-brand-400">
                                                <Clock size={12} /> {timeAgo(notif.createdAt)}
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
                            <button
                                onClick={() => {
                                    router.push('/dashboard/notifications');
                                    setIsOpen(false);
                                }}
                                className="text-sm font-medium text-accent hover:text-accent-dark transition-colors"
                            >
                                View all notifications
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
