import http from 'http';
import chalk from 'chalk';
import { readCallbackBody } from './callback-body.js';
import { CallbackResponse } from './callback-response.js';
import { DeviceLoginSession } from './device-login-session.js';

type AuthCallbackContext = Parameters<typeof DeviceLoginSession.complete>[1];

export async function handleCallbackPost(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  server: http.Server,
  context: AuthCallbackContext,
) {
  try {
    const body = await readCallbackBody(req, res);
    const session = await DeviceLoginSession.complete(body, context);
    CallbackResponse.json(res, 200, { success: true });

    console.log(chalk.green.bold('\n✅ Successfully logged in!'));
    console.log(chalk.gray(`Logged in as: ${session.email || session.uid}`));
    console.log(chalk.gray(`Session saved to ~/.keyflow/config.json\n`));
    CallbackResponse.scheduleExit(server, 0);
  } catch (error) {
    const responseSent = Boolean((error as { responseSent?: boolean }).responseSent);
    if (!responseSent && !res.headersSent) {
      CallbackResponse.json(res, 400, { success: false, error: CallbackResponse.errorMessage(error) });
    }
    console.error(chalk.red('\n❌ Auth failed:'), CallbackResponse.errorMessage(error));
    CallbackResponse.scheduleExit(server, 1);
  }
}
