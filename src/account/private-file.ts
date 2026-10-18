import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

/** Files under `~/.keyflow`, readable only by the current user. */
export const PrivateFile = {
  directory: () => path.join(os.homedir(), '.keyflow'),

  /** Replace `file` atomically with owner-only permissions. */
  writeJson(file: string, value: unknown) {
    const directory = path.dirname(file);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    const temporary = path.join(directory, `.session-${randomUUID()}.tmp`);
    try {
      fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
      fs.renameSync(temporary, file);
      fs.chmodSync(file, 0o600);
    } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  },
};
