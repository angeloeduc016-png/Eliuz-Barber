const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('node:http');

const { app } = require('../backend/src/server');

test('backend monta a aplicação Express com a rota de saúde', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();

  const response = await new Promise((resolve, reject) => {
    const call = request.get({ hostname: '127.0.0.1', port: address.port, path: '/api/health' }, (result) => {
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