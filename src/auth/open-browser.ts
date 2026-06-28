import { spawn } from 'child_process';

export function openBrowser(url: string) {
  const command = process.platform === 'win32'
    ? 'cmd'
    : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
  const args = process.platform === 'win32'
    ? ['/c', 'start', '', url]
    : [url];

  spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
}
