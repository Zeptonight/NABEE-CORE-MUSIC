import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'nabee-test-'));
process.env.SESSION_SECRET = 'test-session-secret-0123456789abcdef0123456789';
process.env.DISCORD_TOKEN = '';
process.env.GITHUB_CLIENT_ID = '';
process.env.GITHUB_CLIENT_SECRET = '';
process.env.GITHUB_OWNER_ID = '123456';
//# sourceMappingURL=setup.js.map