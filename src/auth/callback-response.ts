import http from 'http';

function jsonResponse(res: http.ServerResponse, status: number, payload: Record<string, unknown>) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function scheduleServerExit(server: http.Server, exitCode: number) {
  setTimeout(() => {
    server.close();
    process.exit(exitCode);
  }, 500);
}

export const CallbackResponse = {
  errorMessage: getErrorMessage,
  json: jsonResponse,
  scheduleExit: scheduleServerExit,
} as const;
