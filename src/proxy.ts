import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/reset-password', '/forgot-password'];

export function proxy(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    const path = request.nextUrl.pathname;

    const isAuthPage = publicRoutes.some(route => path.startsWith(route));

    if (!token && !isAuthPage) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token && isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Client vs Admin path validation can be handled in the actual server components 
    // after cryptographically verifying the token utilizing Node.js APIs (jsonwebtoken).

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.png$).*)'],
};
