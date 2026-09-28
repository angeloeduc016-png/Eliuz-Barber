const { app } = require('./backend/src/server');
const { connectDatabase } = require('./backend/src/db/conn');

let databaseReady;

module.exports = async function vercelHandler(request, response) {
  const originalUrl = String(request.url || '/');
  if (originalUrl === '/backend' || originalUrl.startsWith('/backend/')) {
    request.url = `/api${originalUrl.slice('/backend'.length)}`;
  }

  const requestPath = String(request.url || '').split('?')[0];
  const publicRoute = /\/health$/.test(requestPath) || /\/auth\/providers$/.test(requestPath);
  if (!publicRoute) {
    if (!databaseReady) {
      databaseReady = connectDatabase().catch((error) => {
        databaseReady = null;
        throw error;
      });
    }

    try {
      await databaseReady;
    } catch (error) {
      console.error('Falha ao conectar ao banco na função serverless:', error);
      response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({
        ok: false,
        message: 'Serviço temporariamente indisponível. Verifique a conexão e as variáveis do banco de dados na Vercel.',
      }));
      return;
    }
  }
  return app(request, response);
};