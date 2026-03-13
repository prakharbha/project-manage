import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { Resend } from 'resend';

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
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const params = await context.params;
        const taskId = params.id;
        const { content } = await req.json();

        if (!content) return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });

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
            data: { taskId, userId: session.userId, content },
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
                                   <strong style="color:#374151;">${task.client.companyName || 'A client'}</strong> left a comment on task
                                   <strong style="color:#374151;">${task.name}</strong>.
                                 </p>
                                 <div style="background:#f9fafb;border-left:3px solid #2e3845;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:28px;">
                                   <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${content}</p>
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
                                   <strong style="color:#374151;">${task.name}</strong>.
                                 </p>
                                 <div style="background:#f9fafb;border-left:3px solid #2e3845;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:28px;">
                                   <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${content}</p>
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

        return NextResponse.json(comment, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
