/**
 * Track source abstraction. Implementation: play-dl (YouTube).
 * Isolated here so the engine never depends on a specific provider SDK directly.
 */
import * as playdl from 'play-dl';
import { log } from '../logger.js';

export interface SourceTrack {
  id: string;
  url: string;
  title: string;
  author: string;
  durationMs: number;
  thumbnail: string;
  source: 'youtube';
}

export class SourceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new SourceError(code, `source timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function bestThumb(thumbs: { url: string; width?: number; height?: number }[] | undefined): string {
  if (!thumbs || thumbs.length === 0) return '';
  const sorted = [...thumbs].sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0));
  return sorted[0]?.url ?? '';
}

function mapError(e: unknown, code: string): SourceError {
  if (e instanceof SourceError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  log.debug({ err: msg }, 'source error');
  return new SourceError(code, msg);
}

export async function resolveQuery(query: string, timeoutMs = 15000): Promise<SourceTrack | null> {
  try {
    if (/^https?:\/\//i.test(query)) {
      const info = await withTimeout(playdl.video_info(query), timeoutMs, 'RESOLVE_TIMEOUT');
      const v = info?.video_details;
      if (!v) return null;
      return {
        id: v.id ?? '',
        url: v.url ?? query,
        title: v.title ?? 'Unknown',
        author: v.channel?.name ?? 'Unknown',
        durationMs: (v.durationInSec ?? 0) * 1000,
        thumbnail: bestThumb(v.thumbnails),
        source: 'youtube',
      };
    }
    const results = await withTimeout(playdl.search(query, { limit: 1 }), timeoutMs, 'SEARCH_TIMEOUT');
    const v = results?.[0];
    if (!v) return null;
    return {
      id: v.id ?? '',
      url: v.url ?? '',
      title: v.title ?? 'Unknown',
      author: v.channel?.name ?? 'Unknown',
      durationMs: (v.durationInSec ?? 0) * 1000,
      thumbnail: bestThumb(v.thumbnails),
      source: 'youtube',
    };
  } catch (e) {
    throw mapError(e, 'RESOLVE_FAILED');
  }
}

export interface RawStream {
  stream: NodeJS.ReadableStream;
}

export async function openStream(url: string, seekSec = 0, timeoutMs = 20000): Promise<RawStream> {
  try {
    const info = await withTimeout(
      playdl.stream(url, seekSec > 0 ? { seek: seekSec } : {}),
      timeoutMs,
      'STREAM_TIMEOUT',
    );
    return { stream: info.stream };
  } catch (e) {
    throw mapError(e, 'STREAM_FAILED');
  }
}
