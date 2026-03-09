import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
                project: { include: { client: true } }
            }
        });

        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

        if (session.role === 'CLIENT' && task.project.clientId !== session.userId) {
            return NextResponse.json({ error: 'Unauthorized to comment on this task' }, { status: 403 });
        }

        const comment = await prisma.comment.create({
            data: {
                taskId,
                userId: session.userId,
                content
            },
            include: { user: { select: { name: true, role: true, companyName: true } } }
        });

        if (resend) {
            try {
                const isClient = session.role === 'CLIENT';
                const toEmail = isClient ? 'admin@nandann.com' : task.project.client.email;
                const senderName = isClient ? (task.project.client.companyName || 'Client') : 'Nandann Admin';

                await resend.emails.send({
                    from: 'Nandann OS <notifications@nandann.com>',
                    to: toEmail,
                    subject: `New Comment on Task: ${task.name}`,
                    html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #111;">New Task Comment</h2>
              <p><strong>${senderName}</strong> left a new comment on the task <strong>${task.name}</strong>:</p>
              <blockquote style="border-left: 4px solid #eee; padding-left: 10px; color: #555; background: #f9f9f9; padding: 12px; border-radius: 4px;">
                ${content}
              </blockquote>
              <p style="margin-top: 24px;">
                <a href="https://clients.nandann.com/dashboard" style="background: #111; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View in Dashboard
                </a>
              </p>
            </div>
           `
                });
            } catch (err) {
                console.error('Failed to send Resend email', err);
            }
        }

        return NextResponse.json(comment, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
