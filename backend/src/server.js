const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const { connectDatabase } = require('./db/conn');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || !config.corsOrigins.length || config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origem não permitida pelo CORS.'));
  },
};

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.get('/', (request, response) => response.json({ ok: true, service: 'eliuz-barber-backend' }));
app.get('/health', (request, response) => response.json({ ok: true, service: 'eliuz-barber-backend' }));
app.use('/api', apiRoutes);
app.use((error, request, response, next) => {
  if (error.message === 'Origem não permitida pelo CORS.') {
    response.status(403).json({ ok: false, message: error.message });
    return;
  }
  next(error);
});
app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ ok: false, message: 'Erro interno do servidor.' });
});

async function startServer() {
  await connectDatabase();
  return app.listen(config.port, config.host, () => {
    console.log(`Backend ativo em http://${config.host}:${config.port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Não foi possível iniciar o backend:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
