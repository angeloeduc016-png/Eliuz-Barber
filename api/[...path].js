const { app } = require('../backend/src/server');
const { connectDatabase } = require('../backend/src/db/conn');

let databaseReady;

module.exports = async function vercelHandler(request, response) {
  const requestPath = String(request.url || '').split('?')[0];
  const publicRoute = /\/health$/.test(requestPath) || /\/auth\/providers$/.test(requestPath);
  if (!publicRoute) {
    databaseReady ||= connectDatabase();
    await databaseReady;
  }
  return app(request, response);
};
