import { CallbackResponse } from './callback-response.js';
export const AUTH_CALLBACK_MAX_BODY_BYTES = 8 * 1024;
export const AUTH_REQUEST_TIMEOUT_MS = 15_000;
export function readCallbackBody(req, res) {
    return new Promise((resolve, reject) => {
        let body = '';
        let settled = false;
        const fail = (status, message) => {
            if (settled)
                return;
            settled = true;
            if (!res.headersSent) {
                CallbackResponse.json(res, status, { success: false, error: message });
            }
            reject(Object.assign(new Error(message), { responseSent: true }));
        };
        req.setTimeout(AUTH_REQUEST_TIMEOUT_MS, () => {
            fail(408, 'auth_callback_timeout');
            req.destroy(new Error('auth_callback_timeout'));
        });
        req.on('data', chunk => {
            if (settled)
                return;
            body += chunk.toString();
            if (Buffer.byteLength(body) > AUTH_CALLBACK_MAX_BODY_BYTES) {
                fail(413, 'payload_too_large');
                req.destroy(new Error('auth_callback_body_too_large'));
            }
        });
        req.on('error', (error) => {
            if (!settled) {
                settled = true;
                reject(error);
            }
        });
        req.on('end', () => {
            if (!settled) {
                settled = true;
                resolve(body);
            }
        });
    });
}
