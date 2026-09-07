const crypto = require('crypto');

const pendingStates = new Map();
const providers = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scopes: 'openid profile email',
  },
  facebook: {
    clientId: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    authorizationEndpoint: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenEndpoint: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: 'public_profile,email',
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
    authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
    tokenEndpoint: 'https://appleid.apple.com/auth/token',
    scopes: 'name email',
  },
};

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function publicBackendUrl() {
  return (process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function publicAppUrl() {
  return (process.env.APP_PUBLIC_URL || 'http://localhost:8080').replace(/\/$/, '');
}

function allowedAppOrigins() {
  return new Set([publicAppUrl(), ...(process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean)]);
}

function redirectUri(provider) {
  return `${publicBackendUrl()}/api/auth/${provider}/callback`;
}

function isConfigured(provider) {
  const config = providers[provider];
  if (!config?.clientId) return false;
  if (provider === 'apple') return Boolean(config.clientSecret || (process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY));
  return Boolean(config.clientSecret);
}

function providerStatus() {
  return Object.fromEntries(Object.keys(providers).map((provider) => [provider, isConfigured(provider)]));
}

function cleanStates() {
  const now = Date.now();
  for (const [state, value] of pendingStates) {
    if (now - value.createdAt > 10 * 60 * 1000) pendingStates.delete(state);
  }
}

function startProvider(provider, returnTo = '') {
  const config = providers[provider];
  if (!config) throw new Error('Provedor de login inválido.');
  if (!isConfigured(provider)) throw new Error(`O login com ${provider} ainda não foi configurado no backend.`);

  cleanStates();
  const state = randomToken();
  const nonce = randomToken();
  let safeReturnTo = publicAppUrl();
  try {
    const candidate = new URL(returnTo || publicAppUrl());
    if (allowedAppOrigins().has(candidate.origin)) safeReturnTo = candidate.toString();
  } catch (error) {
    safeReturnTo = publicAppUrl();
  }
  pendingStates.set(state, { provider, nonce, returnTo: safeReturnTo, createdAt: Date.now() });

  const url = new URL(config.authorizationEndpoint);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri(provider));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes);
  url.searchParams.set('state', state);
  if (provider === 'google') url.searchParams.set('nonce', nonce);
  if (provider === 'apple') {
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('response_mode', 'form_post');
  }
  return url.toString();
}

async function postForm(url, values) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(values),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error_description || payload.error || 'O provedor recusou a autenticação.');
  return payload;
}

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Token de identidade inválido.');
  return {
    header: JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')),
    payload: JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')),
    signingInput: `${parts[0]}.${parts[1]}`,
    signature: Buffer.from(parts[2], 'base64url'),
  };
}

function validateClaims(claims, provider, nonce) {
  if (!claims?.sub || (claims.exp && Number(claims.exp) * 1000 < Date.now())) throw new Error('Token de identidade expirado ou inválido.');
  if (provider === 'google' && (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) || claims.aud !== providers.google.clientId)) {
    throw new Error('Token do Google não pertence a este aplicativo.');
  }
  if (provider === 'apple' && (claims.iss !== 'https://appleid.apple.com' || claims.aud !== providers.apple.clientId || claims.nonce !== nonce)) {
    throw new Error('Token da Apple não pertence a este aplicativo.');
  }
}

async function verifyIdentityToken(token, provider, nonce) {
  const decoded = decodeJwtPayload(token);
  const claims = decoded.payload;
  validateClaims(claims, provider, nonce);
  const jwksUrl = provider === 'google' ? 'https://www.googleapis.com/oauth2/v3/certs' : 'https://appleid.apple.com/auth/keys';
  const keysResponse = await fetch(jwksUrl);
  const keySet = await keysResponse.json();
  const jwk = keySet.keys?.find((key) => key.kid === decoded.header.kid);
  if (!jwk) throw new Error('Chave pública do provedor não encontrada.');
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const valid = crypto.verify('sha256', Buffer.from(decoded.signingInput), { key: publicKey, dsaEncoding: 'ieee-p1363' }, decoded.signature);
  if (!valid) throw new Error('Assinatura do token de identidade inválida.');
  return claims;
}

function appleClientSecret() {
  if (process.env.APPLE_CLIENT_SECRET) return process.env.APPLE_CLIENT_SECRET;
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: process.env.APPLE_KEY_ID, typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: process.env.APPLE_TEAM_ID, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 15777000, aud: 'https://appleid.apple.com', sub: providers.apple.clientId })).toString('base64url');
  const input = `${header}.${payload}`;
  const signature = crypto.createSign('SHA256').update(input).sign({ key: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'), dsaEncoding: 'ieee-p1363' });
  return `${input}.${signature.toString('base64url')}`;
}

async function completeProviderLogin(provider, code, state, body = {}) {
  const pending = pendingStates.get(state);
  pendingStates.delete(state);
  if (!pending || pending.provider !== provider || Date.now() - pending.createdAt > 10 * 60 * 1000) throw new Error('Sessão OAuth expirada. Tente novamente.');

  const config = providers[provider];
  const tokenPayload = await postForm(config.tokenEndpoint, {
    code,
    client_id: config.clientId,
    client_secret: provider === 'apple' ? appleClientSecret() : config.clientSecret,
    redirect_uri: redirectUri(provider),
    grant_type: 'authorization_code',
  });

  let profile;
  if (provider === 'google') {
    await verifyIdentityToken(tokenPayload.id_token, provider, pending.nonce);
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokenPayload.access_token}` } });
    profile = await response.json();
  } else if (provider === 'facebook') {
    const url = new URL('https://graph.facebook.com/me');
    url.searchParams.set('fields', 'id,name,email');
    url.searchParams.set('access_token', tokenPayload.access_token);
    const response = await fetch(url);
    profile = await response.json();
    if (!profile.id) throw new Error(profile.error?.message || 'Não foi possível obter o perfil do Facebook.');
  } else {
    const claims = await verifyIdentityToken(tokenPayload.id_token, provider, pending.nonce);
    let appleUser = {};
    try {
      appleUser = body.user ? JSON.parse(body.user) : {};
    } catch (error) {
      appleUser = {};
    }
    profile = { sub: claims.sub, name: appleUser.name?.firstName || claims.name, email: claims.email };
  }

  if (!profile?.email) throw new Error('O provedor não retornou um e-mail para esta conta.');
  return {
    provider,
    providerId: String(profile.sub || profile.id),
    name: profile.name || profile.given_name || profile.email.split('@')[0],
    email: profile.email,
    returnTo: pending.returnTo,
  };
}

module.exports = { startProvider, completeProviderLogin, providerStatus, publicAppUrl, isConfigured };
