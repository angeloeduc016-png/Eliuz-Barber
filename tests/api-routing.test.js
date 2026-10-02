const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const apiModule = require('../backend/src/controllers/apiController');
const vercelHandler = require('../api/[...path].js');
const {
  getRoute,
  normalizeGalleryItem,
  normalizeProduct,
  reconcileDefaultGallery,
  reconcileDefaultProducts,
} = apiModule;

test('getRoute normalizes API prefixes', () => {
  assert.equal(getRoute('/bookings'), 'bookings');
  assert.equal(getRoute('/api/bookings'), 'bookings');
  assert.equal(getRoute('/api/auth/login'), 'auth/login');
});

test('roteia mutações de produtos e galeria pelas rotas-base', async () => {
  for (const route of ['products', 'gallery']) {
    for (const method of ['POST', 'DELETE']) {
      const response = await apiModule.handleRequest({
        path: `/${route}`,
        httpMethod: method,
        headers: {},
        body: JSON.stringify({ id: 'probe-id' }),
      }, {});

      assert.equal(response.statusCode, 401, `${method} /${route} deve chegar à verificação de autenticação`);
      assert.equal(JSON.parse(response.body).message, 'Não autorizado.');
    }
  }
});

test('mantém Content-Type JSON junto ao token nas mutações autenticadas', async () => {
  for (const app of ['cliente', 'profissional']) {
    const requests = [];
    const context = vm.createContext({
      window: { ELIUZ_API_BASE_URL: 'https://example.test/api' },
      document: { querySelector: () => null },
      localStorage: { getItem: () => null, setItem: () => {} },
      sessionStorage: { getItem: () => '', removeItem: () => {} },
      fetch: async (url, options) => {
        requests.push({ url, headers: options.headers });
        return { ok: true, json: async () => ({ product: {}, item: {} }) };
      },
    });
    const storagePath = path.join(__dirname, '..', app, 'src', 'js', 'storage.js');
    vm.runInContext(fs.readFileSync(storagePath, 'utf8'), context, { filename: storagePath });

    await context.window.EliuzStorage.saveProduct({
      name: 'Produto de teste',
      shortDescription: 'Descrição de teste',
      price: 20,
    }, { token: 'test-token' });
    if (app === 'profissional') {
      await context.window.EliuzStorage.saveGalleryItem({
        title: 'Imagem de teste',
        imageUrl: 'data:image/jpeg;base64,dGVzdA==',
      }, { token: 'test-token' });
    }

    assert.equal(requests.length, app === 'profissional' ? 2 : 1);
    requests.forEach(({ headers }) => {
      assert.equal(headers['Content-Type'], 'application/json');
      assert.equal(headers.Authorization, 'Bearer test-token');
    });
  }
});

test('reconcilia o catálogo público preservando produtos personalizados', () => {
  const products = reconcileDefaultProducts([
    { id: 'pomada-modeladora', name: 'Pomada Modeladora Matte' },
    { id: 'produto-personalizado', name: 'Produto personalizado', price: 31 },
    { id: 'kit-presente', name: 'Kit ajustado pelo profissional', price: 95 },
  ]);

  assert.equal(products.length, 19);
  assert.equal(products.some((product) => product.id === 'pomada-modeladora'), false);
  assert.equal(products.find((product) => product.id === 'produto-personalizado')?.price, 31);
  assert.equal(products.find((product) => product.id === 'kit-presente')?.name, 'Kit ajustado pelo profissional');
  assert.ok(products.some((product) => product.name === 'Ampola minoxidil' && product.imageUrl.endsWith('/ampola_minoxidil.PNG')));
});

test('reconcilia os 17 produtos solicitados com os preços e imagens corretos', () => {
  const products = reconcileDefaultProducts([]);

  assert.deepEqual(products.map((product) => [product.name, product.price, product.imageUrl.split('/').at(-1)]), [
    ['Ampola minoxidil', 15, 'ampola_minoxidil.PNG'],
    ['Balm', 30, 'balm.PNG'],
    ['Elixir estimulante capilar', 45, 'elixir.PNG'],
    ['Grooming', 30, 'grooming.PNG'],
    ['Leave-in', 30, 'leave-in.PNG'],
    ['Óleo barba', 30, 'oleo_barba.PNG'],
    ['Pomada black', 25, 'pomada_black.PNG'],
    ['Pomada caramelo brilho', 25, 'pomada_caramelo.PNG'],
    ['Pomada em pó', 30, 'pomada_em_po.PNG'],
    ['Pomada matte', 25, 'pomada_matte.PNG'],
    ['Pomada semi brilho', 25, 'pomada_semi_brilho.PNG'],
    ['Pomada super matte', 25, 'pomada_super_matte.PNG'],
    ['Pomada teia', 25, 'pomada_teia.PNG'],
    ['Shampoo crescimento e fortalecimento', 35, 'shampoo_fortalecimento.PNG'],
    ['Shampoo desintoxicante', 35, 'shampoo_desintoxicante.PNG'],
    ['Shampoo ice', 30, 'shampoo_ice.PNG'],
    ['Shaving gel', 20, 'shaving_gel.PNG'],
  ]);
});

test('atualiza preços padrão sem sobrescrever produtos ajustados pelo profissional', () => {
  const products = reconcileDefaultProducts([
    { id: 'catalogo-balm', name: 'Balm', price: 25, imageUrl: '../images/produtos/balm.PNG' },
    { id: 'catalogo-pomada-matte', name: 'Pomada matte', price: 22, imageUrl: '../images/produtos/pomada_matte.PNG' },
    { id: 'catalogo-gel-fixador', name: 'Gel fixador', price: 25, imageUrl: '../images/produtos/gel_fixador.PNG' },
    { id: 'catalogo-pomada-teia-120g', name: 'Pomada teia 120g', price: 25, imageUrl: '../images/produtos/pomada_teia_120g.PNG' },
  ]);

  assert.equal(products.find((product) => product.id === 'catalogo-balm')?.price, 30);
  assert.equal(products.find((product) => product.id === 'catalogo-pomada-matte')?.price, 22);
  assert.equal(products.some((product) => product.id === 'catalogo-gel-fixador'), false);
  assert.equal(products.some((product) => product.id === 'catalogo-pomada-teia-120g'), false);
});

test('mantém quantidade zero e estoque numérico nos produtos', () => {
  const product = normalizeProduct({ id: 'produto-esgotado', name: 'Produto esgotado', quantity: 0 });

  assert.equal(product.quantity, 0);
  assert.equal(product.stock, 0);
});

test('não reativa produto padrão excluído durante reconciliação', () => {
  const products = reconcileDefaultProducts([
    { id: 'catalogo-ampola-minoxidil', name: 'Ampola minoxidil', ativo: false },
  ]);
  const product = products.find((item) => item.id === 'catalogo-ampola-minoxidil');

  assert.equal(product.ativo, false);
  assert.equal(products.filter((item) => item.id === 'catalogo-ampola-minoxidil').length, 1);
});

test('normaliza metadados e preserva imagens desativadas na galeria padrão', () => {
  const normalized = normalizeGalleryItem({ title: 'Novo corte', imageUrl: '/novo-corte.jpg' });
  const gallery = reconcileDefaultGallery([
    { id: 'galeria-tesoura', title: 'Tesoura', imageUrl: '/tesoura.jpg', ativo: false },
  ]);

  assert.equal(normalized.altText, 'Novo corte');
  assert.equal(normalized.label, 'Corte');
  assert.equal(gallery.find((item) => item.id === 'galeria-tesoura').ativo, false);
  assert.equal(gallery.filter((item) => item.id === 'galeria-tesoura').length, 1);
  assert.equal(gallery.length, 5);
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
