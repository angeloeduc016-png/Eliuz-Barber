const { app } = require('../backend/src/server');
const { connectDatabase } = require('../backend/src/db/conn');

let databaseReady;

module.exports = async function vercelHandler(request, response) {
  const originalUrl = String(request.url || '/');
  if (originalUrl === '/backend' || originalUrl.startsWith('/backend/')) {
    request.url = `/api${originalUrl.slice('/backend'.length)}`;
  }

  const requestPath = String(request.url || '').split('?')[0];
  const publicRoute = /\/health$/.test(requestPath) || /\/auth\/providers$/.test(requestPath);
  if (!publicRoute) {
    databaseReady ||= connectDatabase();
    await databaseReady;
  }
  return app(request, response);
};
