import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Always return 200 to prevent email enumeration attacks
        if (!user) {
            return NextResponse.json({ success: true });
        }

        // Generate cryptographically secure token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour expiry

        await prisma.user.update({
            where: { email },
            data: {
                resetToken,
                resetTokenExpiry: tokenExpiry
            }
        });

        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://clients.nandann.com'}/reset-password?token=${resetToken}`;

        if (resend) {
            await resend.emails.send({
                from: 'Nandann Accounts <notifications@nandann.com>',
                to: email,
                subject: 'Reset Password Request',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
                        <h2>Reset Your Password</h2>
                        <p>We received a request to reset the password for your Nandann Dashboard account.</p>
                        <br/>
                        <a href="${resetUrl}" style="background-color: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                        <br/><br/>
                        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.</p>
                    </div>
                `
            });
        } else {
            console.log(`[Dev Mode] Password Reset Link for ${email}: \n${resetUrl}`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
