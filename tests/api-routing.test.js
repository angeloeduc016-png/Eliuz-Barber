const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('node:http');
const { spawnSync } = require('node:child_process');

const apiModule = require('../backend/src/controllers/apiController');
const vercelHandler = require('../api/[...path].js');
const { getRoute, reconcileDefaultProducts } = apiModule;

test('getRoute normalizes API prefixes', () => {
  assert.equal(getRoute('/bookings'), 'bookings');
  assert.equal(getRoute('/api/bookings'), 'bookings');
  assert.equal(getRoute('/api/auth/login'), 'auth/login');
});

test('reconcilia o catálogo público preservando produtos personalizados', () => {
  const products = reconcileDefaultProducts([
    { id: 'pomada-modeladora', name: 'Pomada Modeladora Matte' },
    { id: 'produto-personalizado', name: 'Produto personalizado', price: 31 },
    { id: 'kit-presente', name: 'Kit ajustado pelo profissional', price: 95 },
  ]);

  assert.equal(products.length, 21);
  assert.equal(products.some((product) => product.id === 'pomada-modeladora'), false);
  assert.equal(products.find((product) => product.id === 'produto-personalizado')?.price, 31);
  assert.equal(products.find((product) => product.id === 'kit-presente')?.name, 'Kit ajustado pelo profissional');
  assert.ok(products.some((product) => product.name === 'Ampola minoxidil' && product.imageUrl.endsWith('/ampola_minoxidil.PNG')));
});

test('handler Vercel normaliza /backend para a rota de saúde da API', async () => {
  const server = request.createServer((incomingRequest, response) => vercelHandler(incomingRequest, response));
  server.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();

  const response = await new Promise((resolve, reject) => {
    const call = request.get({ hostname: '127.0.0.1', port: address.port, path: '/backend/health' }, (result) => {
      let body = '';
      result.on('data', (chunk) => { body += chunk; });
      result.on('end', () => resolve({ statusCode: result.statusCode, body }));
    });
    call.on('error', reject);
  });

  await new Promise((resolve) => server.close(resolve));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { ok: true });
});

test('rotas explícitas de autenticação reutilizam o handler da API', () => {
  const endpoints = [
    require('../api/auth/providers'),
    require('../api/auth/session'),
    require('../api/auth/logout'),
    require('../api/auth/customer/register'),
    require('../api/auth/customer/login'),
  ];

  endpoints.forEach((endpoint) => assert.equal(endpoint, vercelHandler));
});

test('handler responde 503 e permite nova tentativa quando o banco está indisponível', () => {
  const script = `
    const http = require('node:http');
    const handler = require('./vercelHandler');
    const server = http.createServer((req, res) => handler(req, res));
    server.listen(0, '127.0.0.1', async () => {
      const results = [];
      for (let attempt = 0; attempt < 2; attempt += 1) {
        results.push(await new Promise((resolve, reject) => {
          http.get({ hostname: '127.0.0.1', port: server.address().port, path: '/backend/auth/customer/register' }, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
          }).on('error', reject);
        }));
      }
      console.log(JSON.stringify(results));
      server.close();
    });
  `;
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    VERCEL: '1',
    ENV_FILE: 'missing-database-test-env',
    DATABASE_URL: '',
    DB_URL: '',
    DB_HOST: '127.0.0.1',
    DB_PORT: '1',
    DB_CREATE_IF_MISSING: 'false',
    NO_COLOR: '1',
    FORCE_COLOR: '0',
  };
  const result = spawnSync(process.execPath, ['-e', script], { cwd: process.cwd(), env, encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const responses = JSON.parse(result.stdout.trim());
  assert.deepEqual(responses.map(({ status }) => status), [503, 503]);
  assert.match(responses[0].body.message, /banco de dados na Vercel/);
});
