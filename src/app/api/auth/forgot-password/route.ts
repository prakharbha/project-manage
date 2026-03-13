import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';
import { Resend } from 'resend';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/lib/rateLimit';
import { checkCsrf, csrfError } from '@/lib/security';

// 3 reset emails per IP per hour
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60 * 1_000;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = 'Nandann <noreply@nandann.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://clients.nandann.com';

function emailTemplate(title: string, bodyHtml: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Brand -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <span style="font-size:20px;font-weight:700;letter-spacing:-0.3px;color:#2e3845;">NANDANN GOAL</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <!-- Accent bar -->
                <tr>
                  <td style="background:#2e3845;height:4px;font-size:4px;line-height:4px;">&nbsp;</td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    ${bodyHtml}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding:18px 40px;border-top:1px solid #f0f0f0;background:#fafafa;">
                    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                      If you did not request a password reset, you can safely ignore this email.
                      This link will expire in <strong>30 minutes</strong>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: Request) {
    // CSRF check
    if (!checkCsrf(req)) return csrfError();

    // Rate limit per IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(`forgot-password:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

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

        // Invalidate any previous reset token, then issue a fresh one (30-min expiry)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 30 * 60 * 1_000); // 30 minutes

        await prisma.user.update({
            where: { email },
            data: {
                resetToken,
                resetTokenExpiry: tokenExpiry
            }
        });

        const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

        if (resend) {
            await resend.emails.send({
                from: FROM,
                to: email,
                subject: 'Reset Your Password',
                html: emailTemplate(
                    'Reset Your Password',
                    `<h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Reset Your Password</h2>
                     <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
                       We received a request to reset the password for your Nandann account.
                       Click the button below to choose a new password.
                     </p>
                     <a href="${resetUrl}"
                        style="display:inline-block;background:#2e3845;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:7px;font-size:13px;font-weight:600;letter-spacing:0.2px;">
                       Reset Password
                     </a>`
                )
            });
        } else {
            console.log(`[Dev Mode] Password Reset Link for ${email}: \n${resetUrl}`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
