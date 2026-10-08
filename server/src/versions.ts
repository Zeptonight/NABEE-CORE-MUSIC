import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function discordJsVersion(): string {
  try {
    return String(require('discord.js/package.json').version);
  } catch {
    return 'unknown';
  }
}

export function appVersion(): string {
  try {
    return String(require('../../package.json').version);
  } catch {
    return '1.0.0';
  }
}
