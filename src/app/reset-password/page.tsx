"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setStatus('error');
            setMessage("Password must be at least 6 characters long");
            return;
        }

        setLoading(true);
        setStatus('idle');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to reset password');

            setStatus('success');
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="text-center">
                <div className="w-12 h-12 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                    !
                </div>
                <h3 className="font-bold text-brand-900 mb-2">Invalid Link</h3>
                <p className="text-sm text-brand-500 mb-6">Your password reset link is invalid or has expired.</p>
                <Link href="/forgot-password" className="inline-block px-4 py-2 bg-brand-900 text-white rounded-lg text-sm font-medium hover:bg-brand-950 transition-colors">
                    Request New Link
                </Link>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 bg-success/20 text-success-dark rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={24} />
                </div>
                <h3 className="font-bold text-brand-900 mb-2">Password Updated!</h3>
                <p className="text-sm text-brand-600 mb-6">Your password has been successfully reset. Redirecting to login...</p>
            </motion.div>
        );
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="font-bold text-2xl tracking-tight text-brand-900 mb-2">Create New Password</h1>
                <p className="text-brand-500 text-sm">Please enter your new password below to regain access.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {status === 'error' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 text-sm text-danger bg-danger/10 border border-danger/20 rounded-md">
                        {message}
                    </motion.div>
                )}

                <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1.5" htmlFor="password">New Password</label>
                    <input
                        id="password"
                        type="password"
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-brand-900 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1.5" htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        required
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-brand-900 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !password || !confirmPassword}
                    className="w-full flex items-center justify-center py-2.5 px-4 bg-brand-900 hover:bg-brand-950 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                </button>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-300/10 blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="glass-panel p-8 sm:p-10 rounded-2xl w-full max-w-md flex flex-col z-10 mx-4 border border-white/60 shadow-xl"
            >
                <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-800 transition-colors mb-6 w-fit">
                    <ArrowLeft size={16} /> Back to Login
                </Link>

                <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-400" /></div>}>
                    <ResetPasswordForm />
                </Suspense>
            </motion.div>
        </div>
    );
}
