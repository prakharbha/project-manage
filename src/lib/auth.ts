import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const _jwtSecret = process.env.JWT_SECRET;
if (!_jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required. Set it in your .env file.');
}
// Narrow to string so TypeScript accepts it in jwt.sign / jwt.verify
const JWT_SECRET: string = _jwtSecret;

export interface TokenPayload {
    userId: string;
    role: 'ADMIN' | 'CLIENT';
    companyName: string | null;
    name: string;
}

export function signToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
        return null;
    }
}

export async function getSession(): Promise<TokenPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    return verifyToken(token);
}

export async function setSession(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    });
}

export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
}
