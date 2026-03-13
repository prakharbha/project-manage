import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { Resend } from 'resend';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/lib/rateLimit';
import { checkCsrf, csrfError, escapeHtml } from '@/lib/security';
import { sendPushToUser, sendPushToAdmins } from '@/lib/webPush';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = 'Nandann <noreply@nandann.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://clients.nandann.com';

// 20 comments per user per 10 minutes
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1_000;

const MAX_COMMENT_LENGTH = 5_000;
const MAX_BODY_BYTES = 32 * 1_024; // 32 KB

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
                      You are receiving this because notifications are enabled on your account.
                      To manage preferences, visit your
                      <a href="${APP_URL}/dashboard/settings" style="color:#2e3845;text-decoration:underline;">Profile Settings</a>.
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

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    // CSRF check
    if (!checkCsrf(req)) return csrfError();

    // Rate limiting per user IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(`comment:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Body size guard
        const contentLength = Number(req.headers.get('content-length') ?? 0);
        if (contentLength > MAX_BODY_BYTES) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
        }

        const params = await context.params;
        const taskId = params.id;
        const { content } = await req.json();

        // Content validation
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
        }
        if (content.length > MAX_COMMENT_LENGTH) {
            return NextResponse.json(
                { error: `Comment must not exceed ${MAX_COMMENT_LENGTH.toLocaleString()} characters` },
                { status: 400 }
            );
        }

        const trimmedContent = content.trim();

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                client: {
                    select: { id: true, email: true, name: true, companyName: true, notifyComments: true }
                }
            }
        });

        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

        if (session.role === 'CLIENT' && task.clientId !== session.userId) {
            return NextResponse.json({ error: 'Unauthorized to comment on this task' }, { status: 403 });
        }

        const comment = await prisma.comment.create({
            data: { taskId, userId: session.userId, content: trimmedContent },
            include: { user: { select: { name: true, role: true, companyName: true } } }
        });

        const isClient = session.role === 'CLIENT';

        // ── In-app notifications ──
        if (isClient) {
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
            if (admins.length > 0) {
                await prisma.notification.createMany({
                    data: admins.map(admin => ({
                        userId: admin.id,
                        type: 'COMMENT_ADDED',
                        message: `New comment on "${task.name}" from ${task.client.companyName || 'client'}`,
                        link: `/dashboard/tasks?taskId=${task.id}`
                    }))
                });
            }
        } else {
            await prisma.notification.create({
                data: {
                    userId: task.clientId,
                    type: 'COMMENT_ADDED',
                    message: `Nandann Admin replied to "${task.name}"`,
                    link: `/dashboard/tasks?taskId=${task.id}`
                }
            });
        }

        // ── Email notifications ──
        if (resend) {
            try {
                // Escape all user-supplied strings before embedding in HTML
                const safeContent = escapeHtml(trimmedContent);
                const safeTaskName = escapeHtml(task.name);
                const safeCompanyName = escapeHtml(task.client.companyName || 'A client');

                if (isClient) {
                    // Client commented → email all admins with notifyComments enabled
                    const admins = await prisma.user.findMany({
                        where: { role: 'ADMIN', notifyComments: true },
                        select: { email: true }
                    });
                    for (const admin of admins) {
                        await resend.emails.send({
                            from: FROM,
                            to: admin.email,
                            subject: `New Comment on "${task.name}"`,
                            html: emailTemplate(
                                `New Comment on "${task.name}"`,
                                `<h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.3px;">New Comment</h2>
                                 <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                                   <strong style="color:#374151;">${safeCompanyName}</strong> left a comment on task
                                   <strong style="color:#374151;">${safeTaskName}</strong>.
                                 </p>
                                 <div style="background:#f9fafb;border-left:3px solid #2e3845;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:28px;">
                                   <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${safeContent}</p>
                                 </div>
                                 <a href="${APP_URL}/dashboard/tasks?taskId=${task.id}"
                                    style="display:inline-block;background:#2e3845;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:7px;font-size:13px;font-weight:600;letter-spacing:0.2px;">
                                   View Task
                                 </a>`
                            )
                        });
                    }
                } else {
                    // Admin commented → email client if notifyComments enabled
                    if (task.client.notifyComments) {
                        await resend.emails.send({
                            from: FROM,
                            to: task.client.email,
                            subject: `New Reply on "${task.name}"`,
                            html: emailTemplate(
                                `New Reply on "${task.name}"`,
                                `<h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.3px;">New Reply from Nandann</h2>
                                 <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                                   The Nandann team has replied to your task
                                   <strong style="color:#374151;">${safeTaskName}</strong>.
                                 </p>
                                 <div style="background:#f9fafb;border-left:3px solid #2e3845;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:28px;">
                                   <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${safeContent}</p>
                                 </div>
                                 <a href="${APP_URL}/dashboard/tasks?taskId=${task.id}"
                                    style="display:inline-block;background:#2e3845;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:7px;font-size:13px;font-weight:600;letter-spacing:0.2px;">
                                   View Task
                                 </a>`
                            )
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to send comment email', err);
            }
        }

        // ── Push notifications ──
        try {
            const pushUrl = `/dashboard/tasks?taskId=${task.id}`;
            if (isClient) {
                // Client commented → push all admins (no extra pref check — they use notifyComments)
                await sendPushToAdmins({
                    title: 'New Comment',
                    body: `${task.client.companyName || 'A client'} commented on "${task.name}"`,
                    url: pushUrl,
                    tag: `comment-${task.id}`,
                });
            } else {
                // Admin commented → push client if notifyComments enabled
                if (task.client.notifyComments) {
                    await sendPushToUser(task.clientId, {
                        title: 'New Reply from Nandann',
                        body: `The Nandann team replied on "${task.name}"`,
                        url: pushUrl,
                        tag: `comment-${task.id}`,
                    });
                }
            }
        } catch (err) {
            console.error('Failed to send comment push notification', err);
        }

        return NextResponse.json(comment, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/tasks/[id]/comments error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
