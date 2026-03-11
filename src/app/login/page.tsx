"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to login');

            router.push(data.redirect || '/dashboard');
            router.refresh(); // Crucial for layout state update
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-50 relative overflow-hidden">
            {/* Background ambient decorations */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-300/10 blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="glass-panel p-8 sm:p-10 rounded-2xl w-full max-w-md flex flex-col z-10 mx-4 border border-white/60"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="relative w-48 h-16 sm:w-56 sm:h-20 mb-2">
                        <Image src="/nandann-logo.png" alt="Nandann OS Logo" fill className="object-contain" priority />
                    </div>
                    <p className="text-brand-500 text-sm text-center">Manage your tasks seamlessly</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 text-sm text-danger bg-danger/10 border border-danger/20 rounded-md">
                            {error}
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

                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-sm font-medium text-brand-700" htmlFor="password">Password</label>
                            <Link href="/forgot-password" className="text-xs text-accent hover:text-accent-dark transition-colors">Forgot password?</Link>
                        </div>
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center py-2.5 px-4 bg-brand-900 hover:bg-brand-950 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-sm"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
