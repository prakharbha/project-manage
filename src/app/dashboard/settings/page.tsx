"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Loader2, Save, CheckCircle2, Bell, CheckCheck } from 'lucide-react';

interface NotifPrefs {
    notifyTaskUpdates: boolean;
    notifyComments: boolean;
    notifyBillingUpdates: boolean;
}

function Toggle({ enabled, onToggle, loading }: { enabled: boolean; onToggle: () => void; loading: boolean }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 disabled:opacity-50 ${enabled ? 'bg-accent' : 'bg-brand-200'}`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
        </button>
    );
}

export default function SettingsPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    // Notification preferences
    const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
        notifyTaskUpdates: true,
        notifyComments: true,
        notifyBillingUpdates: true,
    });
    const [savingPref, setSavingPref] = useState<string | null>(null);
    const [savedPref, setSavedPref] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/profile');
                if (res.ok) {
                    const data = await res.json();
                    setName(data.name || '');
                    setEmail(data.email || '');
                    setNotifPrefs({
                        notifyTaskUpdates: data.notifyTaskUpdates ?? true,
                        notifyComments: data.notifyComments ?? true,
                        notifyBillingUpdates: data.notifyBillingUpdates ?? true,
                    });
                }
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsSaving(true);

        try {
            const payload: any = {};
            if (name) payload.name = name;
            if (email) payload.email = email;

            if (newPassword) {
                if (!currentPassword) {
                    setError('Current password is required to set a new password.');
                    setIsSaving(false);
                    return;
                }
                payload.currentPassword = currentPassword;
                payload.newPassword = newPassword;
            }

            if (Object.keys(payload).length === 0) {
                setError('No changes to save.');
                setIsSaving(false);
                return;
            }

            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                setSuccessMessage('Profile updated successfully!');
                setCurrentPassword('');
                setNewPassword('');
            } else {
                setError(data.error || 'Failed to update profile.');
            }
        } catch (err: any) {
            setError('An unexpected error occurred.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTogglePref = async (pref: keyof NotifPrefs) => {
        const newValue = !notifPrefs[pref];
        setNotifPrefs(prev => ({ ...prev, [pref]: newValue }));
        setSavingPref(pref);
        setSavedPref(null);

        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [pref]: newValue })
            });
            if (!res.ok) {
                // Revert on failure
                setNotifPrefs(prev => ({ ...prev, [pref]: !newValue }));
            } else {
                setSavedPref(pref);
                setTimeout(() => setSavedPref(null), 2000);
            }
        } catch {
            setNotifPrefs(prev => ({ ...prev, [pref]: !newValue }));
        } finally {
            setSavingPref(null);
        }
    };

    if (isLoadingData) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 size={32} className="animate-spin text-brand-300" />
            </div>
        );
    }

    const notifItems: { key: keyof NotifPrefs; label: string; description: string }[] = [
        {
            key: 'notifyTaskUpdates',
            label: 'Task Updates',
            description: 'Get notified by email when your task status changes.',
        },
        {
            key: 'notifyComments',
            label: 'New Comments',
            description: 'Get notified by email when someone replies to your task.',
        },
        {
            key: 'notifyBillingUpdates',
            label: 'Billing Updates',
            description: 'Get notified by email when billing information is updated.',
        },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-brand-900 mb-2">Profile Settings</h1>
                <p className="text-brand-500">Update your personal information, security, and notification preferences.</p>
            </div>

            {/* Profile & Security */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-border shadow-sm overflow-hidden"
            >
                <div className="p-6 sm:p-8">
                    <form onSubmit={handleSaveProfile} className="space-y-8">
                        {error && (
                            <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger-dark text-sm font-medium">
                                {error}
                            </div>
                        )}
                        {successMessage && (
                            <div className="p-4 bg-success/10 border border-success/20 rounded-lg text-success-dark text-sm font-medium flex items-center gap-2">
                                <CheckCircle2 size={18} />
                                {successMessage}
                            </div>
                        )}

                        {/* Profile Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-brand-900 mb-4 border-b pb-2">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-brand-700 mb-2">
                                        <User size={16} className="text-brand-400" />
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Update your name..."
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-2 bg-brand-50/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900 placeholder:text-brand-400"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-brand-700 mb-2">
                                        <Mail size={16} className="text-brand-400" />
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="Update your email..."
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-2 bg-brand-50/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900 placeholder:text-brand-400"
                                    />
                                    <p className="text-[11px] text-brand-400 mt-1">This connects to your login identity.</p>
                                </div>
                            </div>
                        </div>

                        {/* Security */}
                        <div>
                            <h3 className="text-lg font-semibold text-brand-900 mb-4 border-b pb-2">Security</h3>
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-brand-700 mb-2">
                                        <Lock size={16} className="text-brand-400" />
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter current password to authorize changes..."
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-4 py-2 bg-brand-50/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900 placeholder:text-brand-400"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-brand-700 mb-2">
                                        <Lock size={16} className="text-brand-400" />
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter new password..."
                                        value={newPassword}
                                        minLength={6}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2 bg-brand-50/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-sm text-brand-900 placeholder:text-brand-400"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving || (!name && !email && !newPassword)}
                                className="flex items-center gap-2 bg-brand-900 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-brand-950 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-brand-900"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>

            {/* Notification Preferences */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-xl border border-border shadow-sm overflow-hidden"
            >
                <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-1">
                        <Bell size={18} className="text-brand-400" />
                        <h3 className="text-lg font-semibold text-brand-900">Notification Preferences</h3>
                    </div>
                    <p className="text-sm text-brand-500 mb-6">
                        Choose which email notifications you receive. All notifications are sent from{' '}
                        <span className="font-medium text-brand-700">noreply@nandann.com</span>.
                    </p>

                    <div className="divide-y divide-border">
                        {notifItems.map(({ key, label, description }) => (
                            <div key={key} className="flex items-center justify-between py-4 gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-brand-900">{label}</p>
                                    <p className="text-xs text-brand-500 mt-0.5">{description}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {savedPref === key && (
                                        <span className="flex items-center gap-1 text-xs text-success font-medium">
                                            <CheckCheck size={13} /> Saved
                                        </span>
                                    )}
                                    <Toggle
                                        enabled={notifPrefs[key]}
                                        onToggle={() => handleTogglePref(key)}
                                        loading={savingPref === key}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
