function jsonResponse(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function scheduleServerExit(server, exitCode) {
    setTimeout(() => {
        server.close();
        process.exit(exitCode);
    }, 500);
}
export const CallbackResponse = {
    errorMessage: getErrorMessage,
    json: jsonResponse,
    scheduleExit: scheduleServerExit,
};
