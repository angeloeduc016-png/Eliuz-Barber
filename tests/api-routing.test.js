const test = require('node:test');
const assert = require('node:assert/strict');

const apiModule = require('../backend/src/controllers/apiController');
const { getRoute } = apiModule;

test('getRoute normalizes API prefixes', () => {
  assert.equal(getRoute('/bookings'), 'bookings');
  assert.equal(getRoute('/api/bookings'), 'bookings');
  assert.equal(getRoute('/api/auth/login'), 'auth/login');
});
