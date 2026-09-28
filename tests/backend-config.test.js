const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

test('produção não tenta criar o banco automaticamente por padrão', () => {
  const env = { ...process.env, NODE_ENV: 'production', VERCEL: '1', ENV_FILE: 'missing-vercel-test-env', NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.DB_CREATE_IF_MISSING;
  const result = spawnSync(process.execPath, ['-e', "console.log(require('./backend/src/config/env').db.createDatabase)"], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'false');
});

test('reconhece SSL obrigatório indicado na URL do MySQL', () => {
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    VERCEL: '1',
    ENV_FILE: 'missing-vercel-test-env',
    DATABASE_URL: 'mysql://test-user:test-password@db.example.com:25008/defaultdb?ssl-mode=REQUIRED',
    NO_COLOR: '1',
    FORCE_COLOR: '0',
  };
  delete env.DB_SSL;
  const result = spawnSync(process.execPath, ['-e', "console.log(JSON.stringify(require('./backend/src/config/env').db))"], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout.trim());
  assert.equal(config.host, 'db.example.com');
  assert.equal(config.port, 25008);
  assert.equal(config.database, 'defaultdb');
  assert.equal(config.ssl, true);
  assert.equal(config.createDatabase, false);
});