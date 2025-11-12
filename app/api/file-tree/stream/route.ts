import type { NextRequest } from 'next/server';
import { ensureTreeOnDisk, readTree } from '../route';
import { watch, FSWatcher } from 'node:fs';
import { EventEmitter } from 'node:events';
import path from 'node:path';

const HEARTBEAT_MS = 15000;
const FILE_EVENTS = 'file-change';
const COALESCE_MS = 75;
const TREE_ROOT_DIRECTORY = path.join(process.cwd(), 'tmp', 'runtime-file-tree');

// Share one watcher across all SSE clients for minimal overhead.
const emitter = new EventEmitter();
let watcher: FSWatcher | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Streams the full tree whenever the on-disk watcher detects a change.
export async function GET(_request: NextRequest) {
  await ensureTreeOnDisk();

  let cleanup: (() => void) | null = null;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendSnapshot = () =>
        readTree()
          .then((tree) => controller.enqueue(encoder.encode(formatSse(tree))))
          .catch((error) => console.error('Failed to push file tree snapshot', error));

      await sendSnapshot();

      const unsubscribe = await subscribeToFileTreeChanges(() => {
        sendSnapshot();
      });

      const heartbeat = setInterval(() => {
        // Keep-alive comment prevents proxies from closing the idle SSE stream.
        controller.enqueue(encoder.encode(':heartbeat\n\n'));
      }, HEARTBEAT_MS);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function formatSse(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

async function subscribeToFileTreeChanges(callback: () => void) {
  await ensureWatcher();
  emitter.on(FILE_EVENTS, callback);
  return () => {
    emitter.off(FILE_EVENTS, callback);
    if (emitter.listenerCount(FILE_EVENTS) === 0) {
      stopWatcher();
    }
  };
}

async function ensureWatcher() {
  if (watcher) {
    return;
  }

  await ensureTreeOnDisk();
  watcher = watch(TREE_ROOT_DIRECTORY, { recursive: true }, () => scheduleEmit());
  watcher.on('error', (error) => {
    console.error('File watcher error', error);
    stopWatcher();
  });
}

function stopWatcher() {
  if (!watcher) {
    return;
  }
  watcher.close();
  watcher = null;
}

function scheduleEmit() {
  if (debounceTimer) {
    return;
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    emitter.emit(FILE_EVENTS);
  }, COALESCE_MS);
}
