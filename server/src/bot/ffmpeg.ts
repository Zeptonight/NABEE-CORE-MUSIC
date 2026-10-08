/**
 * ffmpeg resolution for the audio pipeline.
 * Order: FFMPEG_PATH env → system `ffmpeg` on PATH → optional ffmpeg-static package.
 * prism-media (used by @discordjs/voice) reads process.env.FFMPEG_PATH.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { log } from '../logger.js';

let resolved: string | null | undefined;

export function resolveFfmpeg(): string | null {
  if (resolved !== undefined) return resolved;
  const candidates: string[] = [];
  if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);
  // optional peer (only present if installed)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const req = eval('require') as NodeRequire;
    const p = req.resolve('ffmpeg-static', { paths: [process.cwd()] }) as string;
    if (p && existsSync(p)) candidates.push(p);
  } catch {
    /* not installed — fine */
  }
  candidates.push('ffmpeg');
  for (const c of candidates) {
    try {
      const r = spawnSync(c, ['-version'], { stdio: 'ignore', timeout: 5000 });
      if (r.status === 0) {
        resolved = c;
        process.env.FFMPEG_PATH = c;
        log.info({ ffmpeg: c }, 'ffmpeg resolved');
        return resolved;
      }
    } catch {
      /* try next */
    }
  }
  resolved = null;
  log.warn('ffmpeg not found — audio filters/transcode unavailable. Set FFMPEG_PATH or install ffmpeg.');
  return resolved;
}

export function ffmpegAvailable(): boolean {
  return resolveFfmpeg() !== null;
}
