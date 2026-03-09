import { redirect } from 'next/navigation';

export async function POST() {
    const { clearSession } = await import('@/lib/auth');
    await clearSession();
    redirect('/login');
}
