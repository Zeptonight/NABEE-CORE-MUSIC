/** Minimal leveled logger (no external deps, structured output). */
type Level = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: Level = (process.env.LOG_LEVEL as Level) ?? 'info';

function emit(level: Level, obj?: unknown, msg?: string): void {
  if (levelOrder[level] < levelOrder[minLevel]) return;
  const time = new Date().toISOString();
  const line = { time, level, msg, ...(obj && typeof obj === 'object' ? obj : {}) };
  const s = JSON.stringify(line);
  if (level === 'error') console.error(s);
  else if (level === 'warn') console.warn(s);
  else console.log(s);
}

export const log = {
  debug: (obj: unknown, msg?: string) => emit('debug', obj, msg),
  info: (obj: unknown, msg?: string) => emit('info', obj, msg),
  warn: (obj: unknown, msg?: string) => emit('warn', obj, msg),
  error: (obj: unknown, msg?: string) => emit('error', obj, msg),
};
