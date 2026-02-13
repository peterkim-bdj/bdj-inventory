import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ syncLogId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { syncLogId } = await params;

  const syncLog = await prisma.syncLog.findUnique({
    where: { id: syncLogId },
    select: { id: true },
  });

  if (!syncLog) {
    return new Response('Sync log not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  let lastProgress = '';
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const closeStream = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      const poll = async () => {
        if (closed) return;

        try {
          const log = await prisma.syncLog.findUnique({
            where: { id: syncLogId },
            select: { progress: true, status: true },
          });

          if (!log) {
            sendEvent('error', { phase: 'error', error: 'Sync log not found' });
            closeStream();
            return;
          }

          const progressStr = JSON.stringify(log.progress);

          // Only send if changed
          if (progressStr !== lastProgress) {
            lastProgress = progressStr;
            const progress = log.progress as Record<string, unknown> | null;

            if (progress) {
              const phase = progress.phase as string;
              if (phase === 'complete') {
                sendEvent('complete', progress);
                closeStream();
                return;
              } else if (phase === 'error') {
                sendEvent('error', progress);
                closeStream();
                return;
              } else {
                sendEvent('progress', progress);
              }
            }
          }

          // Check if sync log status is terminal (for cases where progress wasn't updated)
          if (log.status === 'COMPLETED' || log.status === 'FAILED' || log.status === 'DIFF_REVIEW') {
            if (!log.progress || (log.progress as Record<string, unknown>).phase !== 'complete') {
              sendEvent(log.status === 'FAILED' ? 'error' : 'complete', {
                phase: log.status === 'FAILED' ? 'error' : 'complete',
              });
            }
            closeStream();
            return;
          }

          // Continue polling
          setTimeout(poll, 500);
        } catch {
          sendEvent('error', { phase: 'error', error: 'Server error' });
          closeStream();
        }
      };

      // Send initial keepalive
      try {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      } catch {
        closed = true;
        return;
      }
      poll();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
