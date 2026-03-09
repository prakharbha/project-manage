"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('idle');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to request reset');

            setStatus('success');
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

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

                <div className="mb-8">
                    <h1 className="font-bold text-2xl tracking-tight text-brand-900 mb-2">Reset Password</h1>
                    <p className="text-brand-500 text-sm">Enter your email and we'll send you a link to reset your password.</p>
                </div>

                {status === 'success' ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="w-12 h-12 bg-success/20 text-success-dark rounded-full flex items-center justify-center mb-4">
                            <MailCheck size={24} />
                        </div>
                        <h3 className="font-bold text-brand-900 mb-2">Check your email</h3>
                        <p className="text-sm text-brand-600 mb-6">We sent a password reset link to <span className="font-semibold text-brand-900">{email}</span></p>
                        <button onClick={() => setStatus('idle')} className="text-sm font-medium text-accent hover:text-accent-dark">
                            Didn't receive it? Try again
                        </button>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {status === 'error' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 text-sm text-danger bg-danger/10 border border-danger/20 rounded-md">
                                {message}
                            </motion.div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-brand-700 mb-1.5" htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                required
                                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-brand-900 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200"
                                placeholder="you@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full flex items-center justify-center py-2.5 px-4 bg-brand-900 hover:bg-brand-950 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
