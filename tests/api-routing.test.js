const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('node:http');

const apiModule = require('../backend/src/controllers/apiController');
const vercelHandler = require('../api/[...path].js');
const { getRoute } = apiModule;

test('getRoute normalizes API prefixes', () => {
  assert.equal(getRoute('/bookings'), 'bookings');
  assert.equal(getRoute('/api/bookings'), 'bookings');
  assert.equal(getRoute('/api/auth/login'), 'auth/login');
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
