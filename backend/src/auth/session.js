const crypto = require('crypto');
const { listCollection, writeCollection } = require('../database/store');

const SESSION_COOKIE = 'eliuz_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return cookies;
    const key = part.slice(0, separator).trim();
    cookies[key] = decodeURIComponent(part.slice(separator + 1).trim());
    return cookies;
  }, {});
}

async function createSession(customer) {
  const sessions = await listCollection('sessions');
  const session = {
    id: randomToken(),
    customerId: customer.id,
    customer,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  sessions.unshift(session);
  await writeCollection('sessions', sessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now()).slice(0, 5000));
  return session;
}

async function getSession(event) {
  const token = parseCookies(event.headers?.cookie || '').eliuz_session;
  if (!token) return null;
  const sessions = await listCollection('sessions');
  const session = sessions.find((item) => item.id === token);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;
  return session;
}

function sessionCookie(token, secure = false) {
  const sameSite = process.env.COOKIE_SAMESITE || 'Lax';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${SESSION_TTL_MS / 1000}${secure ? '; Secure' : ''}`;
}

function clearSessionCookie(secure = false) {
  const sameSite = process.env.COOKIE_SAMESITE || 'Lax';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0${secure ? '; Secure' : ''}`;
}

module.exports = { createSession, getSession, sessionCookie, clearSessionCookie };
