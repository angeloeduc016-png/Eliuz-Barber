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