/**
 * Cloud save for the claude.ai artifact viewer: the save game is mirrored
 * into the viewer's private document (`data/users/<id>/save`) of the
 * artifact's database. Browser storage inside the viewer can be cleared;
 * this copy survives and follows the player to other devices.
 *
 * Feature-detected through `window.claude.use` – anywhere else (dev
 * server, own hosting, tests) every call resolves to "no cloud".
 */

/** The few parts of the viewer runtime this module uses. */
interface DocSnapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface DocRef {
  get(): Promise<DocSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
interface Db {
  doc(path: string): DocRef;
}
interface User {
  id(): Promise<string | null>;
}
interface Downloads {
  save(req: { filename: string; data: string }): Promise<{ status: string }>;
}
interface ClaudeRuntime {
  use(name: 'db'): Promise<Db | null>;
  use(name: 'user'): Promise<User | null>;
  use(name: 'downloads'): Promise<Downloads | null>;
}

function runtime(): ClaudeRuntime | null {
  const c = (globalThis as { claude?: { use?: unknown } }).claude;
  return c && typeof c.use === 'function' ? (c as ClaudeRuntime) : null;
}

/** Documents hold at most 256 KiB; stay clearly below. */
const MAX_BODY_CHARS = 240_000;

export interface CloudSave {
  text: string;
  savedAt: number;
  playTimeMs: number;
}

let docPromise: Promise<DocRef | null> | null = null;

function cloudDoc(): Promise<DocRef | null> {
  docPromise ??= (async () => {
    const rt = runtime();
    if (!rt) return null;
    const [db, user] = await Promise.all([rt.use('db'), rt.use('user')]);
    if (!db || !user) return null;
    const id = await user.id();
    return id ? db.doc(`data/users/${id}/save`) : null;
  })().catch(() => null);
  return docPromise;
}

/** True inside a viewer that grants this page its private cloud document. */
export async function cloudAvailable(): Promise<boolean> {
  return (await cloudDoc()) !== null;
}

// ── Encoding: gzip + base64 where the browser can, plain text otherwise ──

async function gzip(text: string): Promise<string | null> {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function gunzip(b64: string): Promise<string> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

/** Reads the cloud copy (null: none, or no cloud here). */
export async function readCloud(): Promise<CloudSave | null> {
  const doc = await cloudDoc();
  if (!doc) return null;
  const snap = await doc.get();
  const body = snap.exists ? snap.data() : undefined;
  if (!body || typeof body.data !== 'string') return null;
  const text = body.enc === 'gzip' ? await gunzip(body.data) : body.data;
  return { text, savedAt: Number(body.savedAt) || 0, playTimeMs: Number(body.playTimeMs) || 0 };
}

export type CloudWriteResult = 'saved' | 'unavailable' | 'too-large';

let writing: Promise<unknown> = Promise.resolve();

/** Writes the save; calls queue up so only one write per document runs at a time. */
export function writeCloud(save: CloudSave): Promise<CloudWriteResult> {
  const job = writing.then(async (): Promise<CloudWriteResult> => {
    const doc = await cloudDoc();
    if (!doc) return 'unavailable';
    const packed = await gzip(save.text);
    const body = packed ? { enc: 'gzip', data: packed } : { enc: 'plain', data: save.text };
    if (body.data.length > MAX_BODY_CHARS) return 'too-large';
    await doc.set({ v: 1, savedAt: save.savedAt, playTimeMs: save.playTimeMs, ...body });
    return 'saved';
  });
  writing = job.catch(() => undefined);
  return job;
}

/** Forgets the cloud copy (new game from scratch). */
export async function deleteCloud(): Promise<void> {
  const doc = await cloudDoc();
  if (doc) await doc.delete().catch(() => undefined);
}

/** Offers a file through the viewer's save dialog. null: no such dialog here. */
export async function viewerDownload(filename: string, data: string): Promise<'saved' | 'declined' | null> {
  const rt = runtime();
  const downloads = rt ? await rt.use('downloads').catch(() => null) : null;
  if (!downloads) return null;
  try {
    await downloads.save({ filename, data });
    return 'saved';
  } catch {
    return 'declined';
  }
}
