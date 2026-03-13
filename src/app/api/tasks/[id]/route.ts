import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { Resend } from 'resend';
import { checkCsrf, csrfError, escapeHtml, auditLog } from '@/lib/security';
import { sendPushToUser } from '@/lib/webPush';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = 'Nandann <noreply@nandann.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://clients.nandann.com';

const MAX_BODY_BYTES = 256 * 1_024; // 256 KB (billing items can be longer)

const VALID_STATUSES = new Set([
    'PENDING',
    'IN_PROGRESS',
    'WAITING_ON_CLIENT',
    'TESTING',
    'COMPLETED',
]);

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    WAITING_ON_CLIENT: 'Waiting on Client',
    TESTING: 'Testing',
    COMPLETED: 'Completed',
};

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

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    // CSRF check
    if (!checkCsrf(req)) return csrfError();

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

        const body = await req.json();
        const { status, billingHours, billingItems, eta, isPriority } = body;

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                client: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        companyName: true,
                        notifyTaskUpdates: true,
                        notifyBillingUpdates: true,
                    }
                }
            }
        });

        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

        if (session.role === 'CLIENT' && task.clientId !== session.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const dataToUpdate: Record<string, unknown> = {};

        if (session.role === 'ADMIN') {
            // Validate status against allowed enum values
            if (status !== undefined) {
                if (!VALID_STATUSES.has(status)) {
                    return NextResponse.json(
                        { error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}` },
                        { status: 400 }
                    );
                }
                dataToUpdate.status = status;
            }

            if (billingItems !== undefined) {
                // Validate billingItems is an array with numeric hours
                if (!Array.isArray(billingItems)) {
                    return NextResponse.json({ error: 'billingItems must be an array' }, { status: 400 });
                }
                for (const item of billingItems) {
                    const h = Number(item?.hours);
                    if (isNaN(h) || h < 0 || h > 10_000) {
                        return NextResponse.json(
                            { error: 'Each billing item hours must be a number between 0 and 10 000' },
                            { status: 400 }
                        );
                    }
                }
                dataToUpdate.billingItems = billingItems;

                if (!billingHours) {
                    const calculatedHours = billingItems.reduce(
                        (acc: number, item: any) => acc + (Number(item.hours) || 0),
                        0
                    );
                    dataToUpdate.billingHours = calculatedHours;
                } else {
                    const bh = Number(billingHours);
                    if (isNaN(bh) || bh < 0 || bh > 100_000) {
                        return NextResponse.json({ error: 'billingHours must be between 0 and 100 000' }, { status: 400 });
                    }
                    dataToUpdate.billingHours = bh;
                }
            } else if (billingHours !== undefined) {
                const bh = Number(billingHours);
                if (isNaN(bh) || bh < 0 || bh > 100_000) {
                    return NextResponse.json({ error: 'billingHours must be between 0 and 100 000' }, { status: 400 });
                }
                dataToUpdate.billingHours = bh;
            }

            if (eta !== undefined) dataToUpdate.eta = eta ? new Date(eta) : null;
            if (isPriority !== undefined) dataToUpdate.isPriority = Boolean(isPriority);
        } else {
            if (isPriority !== undefined) dataToUpdate.isPriority = Boolean(isPriority);
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided or unauthorized to edit these fields' }, { status: 400 });
        }

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: dataToUpdate
        });

        // Sync client billedHours if billing was modified
        if (session.role === 'ADMIN' && (billingItems !== undefined || billingHours !== undefined)) {
            const totalBilled = await prisma.task.aggregate({
                where: { clientId: task.clientId },
                _sum: { billingHours: true }
            });
            await prisma.user.update({
                where: { id: task.clientId },
                data: { billedHours: totalBilled._sum?.billingHours || 0 }
            });
        }

        // Audit log for admin mutations
        if (session.role === 'ADMIN') {
            auditLog('TASK_UPDATED', session.userId, {
                taskId,
                clientId: task.clientId,
                fields: Object.keys(dataToUpdate),
            });
        }

        // ── Email notifications (admin actions only) ──
        if (resend && session.role === 'ADMIN') {
            try {
                const client = task.client;
                // Escape task name for safe HTML embedding
                const safeTaskName = escapeHtml(task.name);

                // Status change email
                if (status !== undefined && status !== task.status && client.notifyTaskUpdates) {
                    await resend.emails.send({
                        from: FROM,
                        to: client.email,
                        subject: `Task Update: "${task.name}"`,
                        html: emailTemplate(
                            `Task Update: "${task.name}"`,
                            `<h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Task Status Updated</h2>
                             <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                               The status of your task has been updated by the Nandann team.
                             </p>
                             <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                               <tr>
                                 <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
                                   <p style="margin:0 0 10px;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Task</p>
                                   <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#111827;">${safeTaskName}</p>
                                   <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Status</p>
                                   <p style="margin:0;font-size:15px;font-weight:600;color:#2e3845;">${escapeHtml(STATUS_LABELS[status] || status)}</p>
                                 </td>
                               </tr>
                             </table>
                             <a href="${APP_URL}/dashboard/tasks?taskId=${task.id}"
                                style="display:inline-block;background:#2e3845;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:7px;font-size:13px;font-weight:600;letter-spacing:0.2px;">
                               View Task
                             </a>`
                        )
                    });
                }

                // Billing update email
                const billingChanged = billingItems !== undefined || billingHours !== undefined;
                if (billingChanged && client.notifyBillingUpdates) {
                    const newHours = dataToUpdate.billingHours ?? task.billingHours;
                    await resend.emails.send({
                        from: FROM,
                        to: client.email,
                        subject: `Billing Update: "${task.name}"`,
                        html: emailTemplate(
                            `Billing Update: "${task.name}"`,
                            `<h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.3px;">Billing Information Updated</h2>
                             <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                               The billing information for one of your tasks has been updated.
                             </p>
                             <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                               <tr>
                                 <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
                                   <p style="margin:0 0 10px;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Task</p>
                                   <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#111827;">${safeTaskName}</p>
                                   <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Billed Hours</p>
                                   <p style="margin:0;font-size:15px;font-weight:600;color:#2e3845;">${newHours} hrs</p>
                                 </td>
                               </tr>
                             </table>
                             <a href="${APP_URL}/dashboard"
                                style="display:inline-block;background:#2e3845;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:7px;font-size:13px;font-weight:600;letter-spacing:0.2px;">
                               View Dashboard
                             </a>`
                        )
                    });
                }
            } catch (err) {
                console.error('Failed to send task update email', err);
            }
        }

        // ── Push notifications (admin actions only) ──
        if (session.role === 'ADMIN') {
            try {
                const client = task.client;
                const pushUrl = `/dashboard/tasks?taskId=${task.id}`;

                // Status change push
                if (status !== undefined && status !== task.status && client.notifyTaskUpdates) {
                    await sendPushToUser(task.clientId, {
                        title: 'Task Status Updated',
                        body: `"${task.name}" is now ${STATUS_LABELS[status] || status}`,
                        url: pushUrl,
                        tag: `task-status-${task.id}`,
                    });
                }

                // Billing change push
                const billingChanged = billingItems !== undefined || billingHours !== undefined;
                if (billingChanged && client.notifyBillingUpdates) {
                    const newHours = dataToUpdate.billingHours ?? task.billingHours;
                    await sendPushToUser(task.clientId, {
                        title: 'Billing Updated',
                        body: `"${task.name}" billing updated to ${newHours} hrs`,
                        url: `/dashboard`,
                        tag: `task-billing-${task.id}`,
                    });
                }
            } catch (err) {
                console.error('Failed to send task push notification', err);
            }
        }

        return NextResponse.json(updatedTask);
    } catch (error: any) {
        console.error('PATCH /api/tasks/[id] error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    // CSRF check
    if (!checkCsrf(req)) return csrfError();

    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const params = await context.params;
        const taskId = params.id;

        await prisma.task.delete({ where: { id: taskId } });

        auditLog('TASK_DELETED', session.userId, { taskId });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE /api/tasks/[id] error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
