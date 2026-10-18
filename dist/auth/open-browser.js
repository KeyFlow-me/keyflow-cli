import { spawn } from 'child_process';
/** Open `url` without a shell, so characters such as `&` in the URL are never parsed as commands. */
export function openBrowser(url) {
    const [command, args] = process.platform === 'win32'
        ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
        : process.platform === 'darwin'
            ? ['open', [url]]
            : ['xdg-open', [url]];
    const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: false });
    // The login URL is also printed, so a missing opener only means the user opens it by hand.
    child.on('error', () => { });
    child.unref();
}
