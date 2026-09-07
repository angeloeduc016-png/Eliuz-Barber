const {
  listCollection: listData,
  writeCollection: writeData,
  deleteCollectionItem: deleteData,
} = require('../database/store');
const bcrypt = require('bcrypt');
const { startProvider, completeProviderLogin, providerStatus, publicAppUrl } = require('../auth/oauth');
const { createSession, getSession, sessionCookie, clearSessionCookie } = require('../auth/session');

const SERVICE_CATALOG = {
  '1.0 CORTE DE CABELO': { price: 40, duration: 60 },
  '1.1 BARBA': { price: 40, duration: 60 },
  '1.2 BARBA + SOBRANCELHA': { price: 50, duration: 60 },
  '1.3 CORTE + SOBRANCELHA': { price: 50, duration: 60 },
  '1.4 CABELO E BARBA': { price: 70, duration: 120 },
  '1.5 CORTE + BARBA + SOBRANCELHA': { price: 85, duration: 120 },
  '1.6 CORTE INFANTIL': { price: 40, duration: 60 },
  '1.7 SOBRANCELHA': { price: 15, duration: 15 },
  '1.8 BARBA EXPRESS': { price: 25, duration: 30 },
  '1.9 RASPAR CABEÇA': { price: 25, duration: 30 },
  '2.0 PEZINHO': { price: 15, duration: 15 },
  'BIGODE E CAVANHAQUE': { price: 15, duration: 30 },
};

const DEFAULT_ADMIN_LOGIN = process.env.ADMIN_LOGIN || '41967582000167';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Eliuz96430670';
const DEFAULT_ADMIN_TOKEN = process.env.ADMIN_BEARER_TOKEN || 'eliuz-local-token';
const DEFAULT_PRODUCTS = [
  {
    id: 'pomada-modeladora',
    name: 'Pomada Modeladora Matte',
    shortDescription: 'Fixação média com acabamento seco para penteados do dia a dia.',
    description: 'Controla o volume e mantém o visual alinhado sem deixar brilho excessivo.',
    price: 39.9,
    imageUrl: 'https://images.unsplash.com/photo-1521498542256-5c0f8a3f2f61?auto=format&fit=crop&w=900&q=80',
    category: 'Cabelo',
    stock: 'Pronta entrega',
    featured: true,
  },
  {
    id: 'oleo-barba',
    name: 'Óleo para Barba',
    shortDescription: 'Hidrata, perfuma e reduz o frizz da barba com uso diário.',
    description: 'Ideal para quem quer brilho leve, cheiro agradável e toque macio na barba.',
    price: 34.9,
    imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=80',
    category: 'Barba',
    stock: 'Pronta entrega',
    featured: true,
  },
  {
    id: 'shampoo-3-em-1',
    name: 'Shampoo 3 em 1',
    shortDescription: 'Limpeza prática para cabelo, barba e corpo.',
    description: 'Ajuda a manter a rotina rápida sem abrir mão de uma boa sensação de limpeza.',
    price: 29.9,
    imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4a32c?auto=format&fit=crop&w=900&q=80',
    category: 'Cuidados',
    stock: 'Pronta entrega',
    featured: false,
  },
  {
    id: 'balm-pos-barba',
    name: 'Balm Pós-Barba',
    shortDescription: 'Alivia a pele após o barbear e evita irritações.',
    description: 'Conforto imediato para quem busca uma finalização mais suave no rosto.',
    price: 27.9,
    imageUrl: 'https://images.unsplash.com/photo-1614094082869-cd4e4b7b3f22?auto=format&fit=crop&w=900&q=80',
    category: 'Barba',
    stock: 'Pronta entrega',
    featured: false,
  },
  {
    id: 'kit-presente',
    name: 'Kit Presente Barber',
    shortDescription: 'Combinação pronta para quem quer presentear com estilo.',
    description: 'Kit selecionado com itens de uso diário para manter a aparência em dia.',
    price: 89.9,
    imageUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9f1f1a8f?auto=format&fit=crop&w=900&q=80',
    category: 'Kit',
    stock: 'Sob consulta',
    featured: true,
  },
];

function json(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': process.env.APP_PUBLIC_URL || '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateBR(dateValue) {
  if (!dateValue) return '';
  return dateValue.split('-').reverse().join('/');
}

async function readBody(event) {
  if (!event.body) return {};

  try {
    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'] || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return Object.fromEntries(new URLSearchParams(event.body));
    }
    return JSON.parse(event.body);
  } catch (error) {
    return {};
  }
}

function getTokenFromEvent(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

function isAuthorized(event) {
  return getTokenFromEvent(event) === DEFAULT_ADMIN_TOKEN;
}

function redirect(location, headers = {}) {
  return { statusCode: 302, headers: { Location: location, ...headers }, body: '' };
}

function readCollection(context, key) {
  return listData(key);
}

function listCollection(context, key) {
  return listData(key);
}

function writeCollection(context, key, value) {
  return writeData(key, value);
}

function deleteCollectionItem(context, key, itemId) {
  return deleteData(key, itemId);
}

function publicCustomer(customer) {
  if (!customer) return customer;
  const { passwordHash, ...safeCustomer } = customer;
  return safeCustomer;
}

function normalizeBooking(input = {}) {
  const service = input.service || input.servico || '';
  const value = Number(input.value ?? input.valor ?? SERVICE_CATALOG[service]?.price ?? 0);
  const date = input.date || input.data || '';
  const time = input.time || input.horario || '';
  const name = input.name || input.nome || '';
  const phone = input.phone || input.telefone || '';
  const email = input.email || '';
  const notes = input.notes || input.observation || input.observacao || '';
  const customerId = input.customerId || input.clienteId || '';

  return {
    id: input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    customerId,
    name,
    phone,
    email,
    service,
    value,
    date,
    time,
    notes,
    nome: name,
    telefone: phone,
    servico: service,
    valor: value,
    data: date,
    horario: time,
    observacao: notes,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCustomer(input = {}) {
  const name = input.name || input.nome || '';
  const phone = input.phone || input.telefone || '';
  const email = input.email || '';
  const preferredService = input.preferredService || input.servicoPreferido || '';
  const notes = input.notes || input.observacao || '';
  const authProvider = input.authProvider || '';
  const authProviderId = input.authProviderId || '';
  const passwordHash = input.passwordHash || '';

  return {
    id: input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    phone,
    email,
    preferredService,
    notes,
    authProvider,
    authProviderId,
    passwordHash,
    nome: name,
    telefone: phone,
    servicoPreferido: preferredService,
    observacao: notes,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeProduct(input = {}) {
  const price = Number(input.price ?? input.valor ?? 0);

  return {
    id: input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name || input.nome || '',
    shortDescription: input.shortDescription || input.descricaoCurta || '',
    description: input.description || input.descricao || '',
    price,
    imageUrl: input.imageUrl || input.foto || '',
    category: input.category || input.categoria || '',
    stock: input.stock || input.estoque || '',
    featured: Boolean(input.featured),
    ativo: input.ativo !== false,
    valor: price,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeMessage(input = {}) {
  const body = input.message || input.body || input.mensagem || '';
  const sender = input.sender === 'professional' ? 'professional' : 'customer';

  return {
    id: input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    threadId: input.threadId || input.thread || '',
    customerId: input.customerId || '',
    bookingId: input.bookingId || '',
    orderId: input.orderId || '',
    sender,
    subject: input.subject || input.assunto || '',
    message: body,
    replyTo: input.replyTo || '',
    status: input.status || 'open',
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeOrder(input = {}) {
  const quantity = Number(input.quantity ?? input.qtd ?? 1) || 1;
  const price = Number(input.price ?? input.valor ?? 0);

  return {
    id: input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    customerId: input.customerId || '',
    customerName: input.customerName || input.nome || '',
    phone: input.phone || input.telefone || '',
    productId: input.productId || '',
    productName: input.productName || input.produto || '',
    quantity,
    notes: input.notes || input.observacao || '',
    status: input.status || 'pending',
    price,
    totalPrice: Number(input.totalPrice ?? price * quantity ?? 0),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCashEntry(input = {}) {
  const amount = Number(input.amount ?? 0);

  return {
    id: input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type === 'income' ? 'income' : 'expense',
    description: input.description || '',
    amount,
    date: input.date || todayStr(),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

async function listProducts(context) {
  const items = await listCollection(context, 'products');
  if (items.length) {
    return items;
  }

  const seeded = DEFAULT_PRODUCTS.map((product) => normalizeProduct(product));
  await writeCollection(context, 'products', seeded);
  return seeded;
}

async function saveProduct(context, payload) {
  const product = normalizeProduct(payload);
  if (!product.name || !product.shortDescription || !product.price) {
    return { error: 'Preencha o nome, a descrição curta e o valor do produto.' };
  }

  const items = await listCollection(context, 'products');
  const filtered = items.filter((item) => item.id !== product.id);
  filtered.unshift(product);
  await writeCollection(context, 'products', filtered);
  return product;
}

async function listCustomers(context) {
  const customers = await listCollection(context, 'customers');
  return customers.map(publicCustomer);
}

async function upsertCustomer(context, payload) {
  const customer = normalizeCustomer(payload);
  if (!customer.name || (!customer.phone && !customer.authProviderId)) {
    return { error: 'Preencha o nome e o telefone do cliente.' };
  }

  const customers = await listCollection(context, 'customers');
  const index = customers.findIndex((item) => {
    const sameId = customer.id && item.id === customer.id;
    const samePhone = item.phone === customer.phone;
    const sameEmail = customer.email && String(item.email || '').toLowerCase() === customer.email.toLowerCase();
    const sameProvider = customer.authProviderId && item.authProvider === customer.authProvider && item.authProviderId === customer.authProviderId;
    return sameId || samePhone || sameEmail || sameProvider;
  });
  if (index >= 0) {
    customers[index] = {
      ...customers[index],
      ...customer,
      phone: customer.phone || customers[index].phone,
      passwordHash: customer.passwordHash || customers[index].passwordHash || '',
      authProvider: customer.authProvider || customers[index].authProvider || '',
      authProviderId: customer.authProviderId || customers[index].authProviderId || '',
      updatedAt: new Date().toISOString(),
    };
  } else {
    customers.unshift(customer);
  }

  await writeCollection(context, 'customers', customers);
  return publicCustomer(index >= 0 ? customers[index] : customer);
}

async function registerCustomer(context, payload) {
  const name = String(payload.name || '').trim();
  const phone = String(payload.phone || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  if (!name || !phone || !email || password.length < 8) {
    return { error: 'Informe nome, telefone, e-mail e uma senha com pelo menos 8 caracteres.' };
  }

  const customers = await listCollection(context, 'customers');
  const exists = customers.find((customer) => String(customer.email || '').toLowerCase() === email || String(customer.phone || '').replace(/\D/g, '') === phone.replace(/\D/g, ''));
  if (exists) return { error: 'Já existe uma conta com este e-mail ou telefone.', statusCode: 409 };

  const passwordHash = await bcrypt.hash(password, 12);
  const customer = await upsertCustomer(context, { name, phone, email, passwordHash });
  return { customer };
}

async function loginCustomer(context, payload) {
  const identity = String(payload.identity || '').trim();
  const password = String(payload.password || '');
  if (!identity || !password) return { error: 'Informe seu e-mail ou telefone e sua senha.', statusCode: 422 };

  const customers = await listCollection(context, 'customers');
  const normalizedPhone = identity.replace(/\D/g, '');
  const customer = customers.find((item) => {
    const sameEmail = String(item.email || '').toLowerCase() === identity.toLowerCase();
    const samePhone = normalizedPhone && String(item.phone || '').replace(/\D/g, '') === normalizedPhone;
    return sameEmail || samePhone;
  });
  if (!customer?.passwordHash) return { error: 'Conta não encontrada ou senha ainda não cadastrada.', statusCode: 401 };
  if (!await bcrypt.compare(password, customer.passwordHash)) return { error: 'E-mail, telefone ou senha inválidos.', statusCode: 401 };
  return { customer: publicCustomer(customer) };
}

async function listMessages(context, scope, filter = {}) {
  const messages = await listCollection(context, 'messages');

  if (scope === 'admin') {
    return messages;
  }

  const threadId = String(filter.threadId || filter.customerId || filter.phone || '').trim();
  if (!threadId) {
    return [];
  }

  return messages.filter((message) => {
    return String(message.threadId || '') === threadId || String(message.customerId || '') === threadId || String(message.phone || '') === threadId;
  });
}

async function saveMessage(context, payload) {
  const message = normalizeMessage(payload);
  if (!message.message || !message.threadId) {
    return { error: 'Informe o assunto/conversa e a mensagem.' };
  }

  const items = await listCollection(context, 'messages');
  const filtered = items.filter((item) => item.id !== message.id);
  filtered.unshift(message);
  await writeCollection(context, 'messages', filtered);
  return message;
}

async function saveOrder(context, payload) {
  const order = normalizeOrder(payload);
  if (!order.customerName || !order.phone || !order.productId || !order.productName) {
    return { error: 'Preencha os dados do pedido.' };
  }

  const items = await listCollection(context, 'orders');
  const filtered = items.filter((item) => item.id !== order.id);
  filtered.unshift(order);
  await writeCollection(context, 'orders', filtered);
  return order;
}

async function updateOrder(context, orderId, payload) {
  const items = await listCollection(context, 'orders');
  const index = items.findIndex((item) => item.id === orderId);
  if (index < 0) {
    return null;
  }

  items[index] = {
    ...items[index],
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  await writeCollection(context, 'orders', items);
  return items[index];
}

async function listBookings(context, scope) {
  const bookings = await readCollection(context, 'bookings');
  if (scope === 'admin') {
    return bookings;
  }

  return bookings.map((booking) => ({
    id: booking.id,
    service: booking.service,
    date: booking.date,
    time: booking.time,
    valor: booking.valor,
    data: booking.data,
    horario: booking.horario,
  }));
}

async function createBooking(context, payload) {
  const bookings = await readCollection(context, 'bookings');
  const booking = normalizeBooking(payload);

  if (!booking.name || !booking.phone || !booking.service || !booking.date || !booking.time) {
    return { error: 'Preencha todos os campos do agendamento.' };
  }

  if (booking.date < todayStr()) {
    return { error: 'Não é possível agendar em uma data passada.' };
  }

  const customer = await upsertCustomer(context, {
    id: booking.customerId,
    name: booking.name,
    phone: booking.phone,
    email: payload.email || '',
    notes: booking.notes,
  });

  if (customer?.error) {
    return customer;
  }

  booking.customerId = customer.id;

  const alreadyBooked = bookings.some((item) => item.data === booking.date && item.horario === booking.time);
  if (alreadyBooked) {
    return { error: 'Esse horário já está ocupado.', statusCode: 409 };
  }

  bookings.unshift(booking);
  await writeCollection(context, 'bookings', bookings);

  return { booking };
}

async function deleteBooking(context, bookingId) {
  const bookings = await readCollection(context, 'bookings');
  const filtered = bookings.filter((item) => item.id !== bookingId);
  await writeCollection(context, 'bookings', filtered);
  return filtered;
}

async function listCashEntries(context) {
  return readCollection(context, 'cash');
}

async function createCashEntry(context, payload) {
  const entries = await readCollection(context, 'cash');
  const entry = normalizeCashEntry(payload);

  if (!entry.description || !entry.amount) {
    return { error: 'Preencha a descrição e o valor.' };
  }

  entries.unshift(entry);
  await writeCollection(context, 'cash', entries);
  return entry;
}

async function deleteCashEntry(context, entryId) {
  const entries = await readCollection(context, 'cash');
  const filtered = entries.filter((item) => item.id !== entryId);
  await writeCollection(context, 'cash', filtered);
  return filtered;
}

function getRoute(pathname) {
  if (!pathname) return '';

  const normalized = String(pathname).trim().replace(/\\/g, '/');
  const withoutApiPrefix = normalized.replace(/^\/api(?:\/|$)/i, '/');

  return withoutApiPrefix.replace(/^\/+/, '').replace(/\/+$/, '');
}

exports.getRoute = getRoute;

async function handleRequest(event, context) {
  const route = getRoute(event.path || '');
  const method = (event.httpMethod || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    const requestOrigin = event.headers?.origin || event.headers?.Origin || process.env.APP_PUBLIC_URL || '*';
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': requestOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': 'no-store',
      },
      body: '',
    };
  }

  if (route === 'health') {
    return json(200, { ok: true });
  }

  if (route === 'auth/providers' && method === 'GET') {
    return json(200, { ok: true, providers: providerStatus() });
  }

  if (route.startsWith('auth/') && route.endsWith('/start') && method === 'GET') {
    const provider = route.split('/')[1];
    try {
      return redirect(startProvider(provider, event.queryStringParameters?.return_to));
    } catch (error) {
      return json(503, { ok: false, message: error.message });
    }
  }

  if (route.startsWith('auth/') && route.endsWith('/callback') && (method === 'GET' || method === 'POST')) {
    const provider = route.split('/')[1];
    const query = event.queryStringParameters || {};
    const body = await readBody(event);
    const code = query.code || body.code;
    const state = query.state || body.state;
    const error = query.error || body.error;
    if (error) return redirect(`${publicAppUrl()}/?auth=error&message=${encodeURIComponent('O login foi cancelado.')}`);

    try {
      const profile = await completeProviderLogin(provider, code, state, body);
      const customer = await upsertCustomer(context, {
        name: profile.name,
        email: profile.email,
        phone: '',
        authProvider: profile.provider,
        authProviderId: profile.providerId,
      });
      if (customer.error) throw new Error(customer.error);
      const session = await createSession(customer);
      const secure = String(event.headers?.['x-forwarded-proto'] || '').toLowerCase() === 'https';
      const destination = new URL(profile.returnTo || publicAppUrl());
      destination.searchParams.set('auth', 'success');
      return redirect(destination.toString(), { 'Set-Cookie': sessionCookie(session.id, secure) });
    } catch (callbackError) {
      return redirect(`${publicAppUrl()}/?auth=error&message=${encodeURIComponent(callbackError.message || 'Não foi possível concluir o login.')}`);
    }
  }

  if (route === 'auth/session' && method === 'GET') {
    const session = await getSession(event);
    return session ? json(200, { ok: true, customer: session.customer }) : json(401, { ok: false, message: 'Sessão não encontrada.' });
  }

  if (route === 'auth/logout' && method === 'POST') {
    return json(200, { ok: true }, { 'Set-Cookie': clearSessionCookie(false) });
  }

  if (route === 'auth/customer/register' && method === 'POST') {
    const body = await readBody(event);
    const result = await registerCustomer(context, body);
    if (result.error) return json(result.statusCode || 422, { ok: false, message: result.error });
    const session = await createSession(result.customer);
    const secure = String(event.headers?.['x-forwarded-proto'] || '').toLowerCase() === 'https';
    return json(201, { ok: true, customer: result.customer }, { 'Set-Cookie': sessionCookie(session.id, secure) });
  }

  if (route === 'auth/customer/login' && method === 'POST') {
    const body = await readBody(event);
    const result = await loginCustomer(context, body);
    if (result.error) return json(result.statusCode || 401, { ok: false, message: result.error });
    const session = await createSession(result.customer);
    const secure = String(event.headers?.['x-forwarded-proto'] || '').toLowerCase() === 'https';
    return json(200, { ok: true, customer: result.customer }, { 'Set-Cookie': sessionCookie(session.id, secure) });
  }

  if (route === 'auth/login' && method === 'POST') {
    const body = await readBody(event);
    const login = String(body.login || '').trim();
    const password = String(body.password || '').trim();

    if (login !== DEFAULT_ADMIN_LOGIN || password !== DEFAULT_ADMIN_PASSWORD) {
      return json(401, { ok: false, message: 'Credenciais inválidas.' });
    }

    return json(200, {
      ok: true,
      token: DEFAULT_ADMIN_TOKEN,
      profile: { login },
    });
  }

  if (route === 'services' && method === 'GET') {
    return json(200, { ok: true, services: SERVICE_CATALOG });
  }

  if (route === 'catalog' && method === 'GET') {
    const products = await listProducts(context);
    return json(200, { ok: true, services: SERVICE_CATALOG, products });
  }

  if (route === 'products' && method === 'GET') {
    const products = await listProducts(context);
    return json(200, { ok: true, items: products });
  }

  if (route === 'products' && method === 'POST') {
    if (!isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const body = await readBody(event);
    const result = await saveProduct(context, body);

    if (result.error) {
      return json(400, { ok: false, message: result.error });
    }

    return json(201, { ok: true, product: result });
  }

  if (route === 'customers' && method === 'GET') {
    const scope = event.queryStringParameters?.scope === 'admin' ? 'admin' : 'public';
    if (scope === 'admin' && !isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const customers = await listCustomers(context);
    if (scope !== 'admin') {
      const phone = String(event.queryStringParameters?.phone || '').trim().replace(/\D/g, '');
      const email = String(event.queryStringParameters?.email || '').trim().toLowerCase();
      if (!phone && !email) {
        return json(200, { ok: true, items: [] });
      }

      return json(200, {
        ok: true,
        items: customers.filter((customer) => {
          const samePhone = phone && String(customer.phone || customer.telefone || '').replace(/\D/g, '') === phone;
          const sameEmail = email && String(customer.email || '').trim().toLowerCase() === email;
          return samePhone || sameEmail;
        }),
      });
    }

    return json(200, { ok: true, items: customers });
  }

  if (route === 'customers' && method === 'POST') {
    const body = await readBody(event);
    const result = await upsertCustomer(context, body);

    if (result.error) {
      return json(400, { ok: false, message: result.error });
    }

    return json(201, { ok: true, customer: result });
  }

  if (route === 'messages' && method === 'GET') {
    const scope = event.queryStringParameters?.scope === 'admin' ? 'admin' : 'public';
    if (scope === 'admin' && !isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const items = await listMessages(context, scope, event.queryStringParameters || {});
    return json(200, { ok: true, items });
  }

  if (route === 'messages' && method === 'POST') {
    const body = await readBody(event);
    const result = await saveMessage(context, body);

    if (result.error) {
      return json(400, { ok: false, message: result.error });
    }

    return json(201, { ok: true, message: result });
  }

  if (route === 'orders' && method === 'GET') {
    const scope = event.queryStringParameters?.scope === 'admin' ? 'admin' : 'public';
    if (scope === 'admin' && !isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const items = await listCollection(context, 'orders');
    return json(200, { ok: true, items });
  }

  if (route === 'orders' && method === 'POST') {
    const body = await readBody(event);
    const result = await saveOrder(context, body);

    if (result.error) {
      return json(400, { ok: false, message: result.error });
    }

    return json(201, { ok: true, order: result });
  }

  if (route.startsWith('orders/') && method === 'PATCH') {
    if (!isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const orderId = route.split('/')[1];
    const body = await readBody(event);
    const updated = await updateOrder(context, orderId, body);
    if (!updated) {
      return json(404, { ok: false, message: 'Pedido não encontrado.' });
    }

    return json(200, { ok: true, order: updated });
  }

  if (route === 'bookings' && method === 'GET') {
    const scope = event.queryStringParameters?.scope === 'admin' ? 'admin' : 'public';
    if (scope === 'admin' && !isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const items = await listBookings(context, scope);
    return json(200, { ok: true, items });
  }

  if (route === 'bookings' && method === 'POST') {
    const body = await readBody(event);
    const result = await createBooking(context, body);

    if (result.error) {
      return json(result.statusCode || 400, { ok: false, message: result.error });
    }

    return json(201, {
      ok: true,
      booking: result.booking,
    });
  }

  if (route.startsWith('bookings/') && method === 'DELETE') {
    if (!isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const bookingId = route.split('/')[1];
    await deleteBooking(context, bookingId);
    return json(200, { ok: true });
  }

  if (route === 'cash' && method === 'GET') {
    if (!isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const items = await listCashEntries(context);
    return json(200, { ok: true, items });
  }

  if (route === 'cash' && method === 'POST') {
    if (!isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const body = await readBody(event);
    const result = await createCashEntry(context, body);

    if (result.error) {
      return json(400, { ok: false, message: result.error });
    }

    return json(201, { ok: true, entry: result });
  }

  if (route.startsWith('cash/') && method === 'DELETE') {
    if (!isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const entryId = route.split('/')[1];
    await deleteCashEntry(context, entryId);
    return json(200, { ok: true });
  }

  if (route.startsWith('messages/') && method === 'PATCH') {
    if (!isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const messageId = route.split('/')[1];
    const body = await readBody(event);
    const messages = await listCollection(context, 'messages');
    const index = messages.findIndex((item) => item.id === messageId);
    if (index < 0) {
      return json(404, { ok: false, message: 'Mensagem não encontrada.' });
    }

    messages[index] = {
      ...messages[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    await writeCollection(context, 'messages', messages);
    return json(200, { ok: true, message: messages[index] });
  }

  if (route.startsWith('customers/') && method === 'PATCH') {
    if (!isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const customerId = route.split('/')[1];
    const body = await readBody(event);
    const customers = await listCollection(context, 'customers');
    const index = customers.findIndex((item) => item.id === customerId);
    if (index < 0) {
      return json(404, { ok: false, message: 'Cliente não encontrado.' });
    }

    customers[index] = {
      ...customers[index],
      ...normalizeCustomer({ ...customers[index], ...body, id: customerId }),
      updatedAt: new Date().toISOString(),
    };
    await writeCollection(context, 'customers', customers);
    return json(200, { ok: true, customer: publicCustomer(customers[index]) });
  }

  if (route.startsWith('products/') && method === 'PATCH') {
    if (!isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const productId = route.split('/')[1];
    const body = await readBody(event);
    const products = await listProducts(context);
    const index = products.findIndex((item) => item.id === productId);
    if (index < 0) {
      return json(404, { ok: false, message: 'Produto não encontrado.' });
    }

    products[index] = {
      ...products[index],
      ...normalizeProduct({ ...products[index], ...body, id: productId }),
      updatedAt: new Date().toISOString(),
    };
    await writeCollection(context, 'products', products);
    return json(200, { ok: true, product: products[index] });
  }

  if (route.startsWith('orders/') && method === 'DELETE') {
    if (!isAuthorized(event)) {
      return json(401, { ok: false, message: 'Não autorizado.' });
    }

    const orderId = route.split('/')[1];
    await deleteCollectionItem(context, 'orders', orderId);
    return json(200, { ok: true });
  }

  return json(404, { ok: false, message: 'Rota não encontrada.' });
}

module.exports = { getRoute, handleRequest };