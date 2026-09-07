window.EliuzStorage = (() => {
  const BOOKING_KEY = 'ELIUZ_BOOKINGS';
  const CASH_KEY = 'ELIUZ_CASH_ENTRIES';
  const SERVICE_CATALOG = {
    '1.0 CORTE DE CABELO': { price: 40, duration: 60, icon: 1 },
    '1.1 BARBA': { price: 40, duration: 60, icon: 2 },
    '1.2 BARBA + SOBRANCELHA': { price: 50, duration: 60, icon: 5 },
    '1.3 CORTE + SOBRANCELHA': { price: 50, duration: 60, icon: 6 },
    '1.4 CABELO E BARBA': { price: 70, duration: 120, icon: 4 },
    '1.5 CORTE + BARBA + SOBRANCELHA': { price: 85, duration: 120, icon: 7 },
    '1.6 CORTE INFANTIL': { price: 40, duration: 60, icon: 8 },
    '1.7 SOBRANCELHA': { price: 15, duration: 15, icon: 3 },
    '1.8 BARBA EXPRESS': { price: 25, duration: 30, icon: 10 },
    '1.9 RASPAR CABEÇA': { price: 25, duration: 30, icon: 9 },
    '2.0 PEZINHO': { price: 15, duration: 15, icon: 12 },
    'BIGODE E CAVANHAQUE': { price: 15, duration: 30, icon: 11 },
  };

  function getApiBase() {
    if (typeof window.ELIUZ_API_BASE_URL === 'string' && window.ELIUZ_API_BASE_URL.trim()) {
      return window.ELIUZ_API_BASE_URL.trim().replace(/\/$/, '');
    }

    const metaApiBase = document.querySelector('meta[name="eliuz-api-base"]')?.content?.trim();
    if (metaApiBase) {
      return metaApiBase.replace(/\/$/, '');
    }

    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
      return '';
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }

    return '/api';
  }

  function buildApiUrl(path) {
    const base = getApiBase();
    if (!base) {
      return path || '/';
    }

    const normalizedPath = String(path || '').trim();
    const cleanedPath = normalizedPath.replace(/^\/api(?=\/|$)/i, '');
    return `${base}${cleanedPath.startsWith('/') ? cleanedPath : `/${cleanedPath}`}`;
  }

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
      return [];
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function isExpiredBooking(booking) {
    const bookingDate = booking?.data || booking?.date || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
      return false;
    }

    return bookingDate < todayStr();
  }

  function pruneExpiredBookings(bookings) {
    return bookings.filter(booking => !isExpiredBooking(booking));
  }

  function getLocalBookings() {
    const bookings = read(BOOKING_KEY);
    const activeBookings = pruneExpiredBookings(bookings);

    if (activeBookings.length !== bookings.length) {
      write(BOOKING_KEY, activeBookings);
    }

    return activeBookings;
  }

  function getLocalCashEntries() {
    return read(CASH_KEY);
  }

  function getLocalCustomers() {
    return read('ELIUZ_CUSTOMERS');
  }

  function getLocalMessages() {
    return read('ELIUZ_MESSAGES');
  }

  function getLocalOrders() {
    return read('ELIUZ_ORDERS');
  }

  function getLocalProducts() {
    return read('ELIUZ_PRODUCTS');
  }

  async function request(path, options = {}, fallback) {
    const apiBase = getApiBase();
    if (!apiBase) {
      return fallback ? fallback() : null;
    }

    try {
      const response = await fetch(buildApiUrl(path), {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.message || 'Falha na comunicação com a API.');
        error.status = response.status;
        throw error;
      }

      return payload;
    } catch (error) {
      if (typeof error?.status === 'number') {
        throw error;
      }

      if (typeof fallback === 'function') {
        return fallback();
      }

      throw error;
    }
  }

  async function getBookings(options = {}) {
    const scope = options.scope === 'admin' ? 'admin' : 'public';
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';

    return request(
      `/api/bookings?scope=${scope}`,
      {
        headers: scope === 'admin' && token ? { Authorization: `Bearer ${token}` } : {},
      },
      () => getLocalBookings()
    ).then((payload) => {
      if (payload && Array.isArray(payload.items)) {
        return payload.items;
      }

      return Array.isArray(payload) ? payload : [];
    });
  }

  async function saveBooking(booking) {
    const payload = {
      name: booking.name,
      phone: booking.phone,
      service: booking.service,
      value: Number(booking.value) || SERVICE_CATALOG[booking.service]?.price || 0,
      date: booking.date,
      time: booking.time,
      customerId: booking.customerId || '',
      notes: booking.notes || '',
    };

    return request(
      '/api/bookings',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => ({
        ok: true,
        booking: payload,
        notificationSent: false,
      })
    ).then((payload) => ({
      ok: true,
      booking: payload.booking || payload.entry || payload,
      notificationSent: Boolean(payload.notificationSent),
    })).catch((error) => {
      if (error.message === 'Esse horário já está ocupado.') {
        return { ok: false, reason: 'horario-ocupado' };
      }

      throw error;
    });
  }

  async function getProducts() {
    return request(
      '/api/products',
      {},
      () => getLocalProducts()
    ).then((payload) => {
      if (payload && Array.isArray(payload.items)) {
        return payload.items;
      }

      return Array.isArray(payload) ? payload : [];
    });
  }

  async function saveProduct(product, options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';
    return request(
      '/api/products',
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(product),
      },
      () => {
        const items = getLocalProducts();
        const normalized = {
          id: product.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...product,
        };
        const filtered = items.filter((item) => item.id !== normalized.id);
        filtered.unshift(normalized);
        write('ELIUZ_PRODUCTS', filtered);
        return normalized;
      }
    ).then((payload) => payload.product || payload);
  }

  async function getCustomers(options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';
    const scope = options.scope === 'admin' ? 'admin' : 'public';
    const params = new URLSearchParams();

    params.set('scope', scope);
    if (options.phone) {
      params.set('phone', options.phone);
    }
    if (options.email) {
      params.set('email', options.email);
    }

    return request(
      `/api/customers?${params.toString()}`,
      {
        headers: scope === 'admin' && token ? { Authorization: `Bearer ${token}` } : {},
      },
      () => {
        const customers = getLocalCustomers();
        const phone = String(options.phone || '').replace(/\D/g, '');
        const email = String(options.email || '').trim().toLowerCase();
        if (!phone && !email) return [];
        return customers.filter((customer) => {
          const samePhone = phone && String(customer.phone || '').replace(/\D/g, '') === phone;
          const sameEmail = email && String(customer.email || '').trim().toLowerCase() === email;
          return samePhone || sameEmail;
        });
      }
    ).then((payload) => {
      if (payload && Array.isArray(payload.items)) {
        return payload.items;
      }

      return Array.isArray(payload) ? payload : [];
    });
  }

  async function saveCustomer(customer, options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';

    return request(
      '/api/customers',
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(customer),
      },
      () => {
        const items = getLocalCustomers();
        const normalized = {
          id: customer.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...customer,
        };
        const filtered = items.filter((item) => item.id !== normalized.id && item.phone !== normalized.phone);
        filtered.unshift(normalized);
        write('ELIUZ_CUSTOMERS', filtered);
        return normalized;
      }
    ).then((payload) => payload.customer || payload);
  }

  async function getMessages(options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';
    const scope = options.scope === 'admin' ? 'admin' : 'public';
    const params = new URLSearchParams();

    params.set('scope', scope);
    if (options.threadId) params.set('threadId', options.threadId);
    if (options.customerId) params.set('customerId', options.customerId);
    if (options.phone) params.set('phone', options.phone);

    return request(
      `/api/messages?${params.toString()}`,
      {
        headers: scope === 'admin' && token ? { Authorization: `Bearer ${token}` } : {},
      },
      () => getLocalMessages()
    ).then((payload) => {
      if (payload && Array.isArray(payload.items)) {
        return payload.items;
      }

      return Array.isArray(payload) ? payload : [];
    });
  }

  async function saveMessage(message, options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';

    return request(
      '/api/messages',
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(message),
      },
      () => {
        const items = getLocalMessages();
        const normalized = {
          id: message.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sender: message.sender || 'customer',
          threadId: message.threadId || message.phone || message.customerId || '',
          subject: message.subject || '',
          message: message.message || message.body || '',
          customerId: message.customerId || '',
          bookingId: message.bookingId || '',
          orderId: message.orderId || '',
          createdAt: new Date().toISOString(),
        };
        items.unshift(normalized);
        write('ELIUZ_MESSAGES', items);
        return normalized;
      }
    ).then((payload) => payload.message || payload);
  }

  async function getOrders(options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';
    const scope = options.scope === 'admin' ? 'admin' : 'public';

    return request(
      `/api/orders?scope=${scope}`,
      {
        headers: scope === 'admin' && token ? { Authorization: `Bearer ${token}` } : {},
      },
      () => getLocalOrders()
    ).then((payload) => {
      if (payload && Array.isArray(payload.items)) {
        return payload.items;
      }

      return Array.isArray(payload) ? payload : [];
    });
  }

  async function saveOrder(order, options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';

    return request(
      '/api/orders',
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(order),
      },
      () => {
        const items = getLocalOrders();
        const normalized = {
          id: order.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: order.status || 'pending',
          ...order,
        };
        const filtered = items.filter((item) => item.id !== normalized.id);
        filtered.unshift(normalized);
        write('ELIUZ_ORDERS', filtered);
        return normalized;
      }
    ).then((payload) => payload.order || payload);
  }

  async function updateOrder(orderId, patch, options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';

    return request(
      `/api/orders/${encodeURIComponent(orderId)}`,
      {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(patch),
      },
      () => {
        const items = getLocalOrders();
        const index = items.findIndex((item) => item.id === orderId);
        if (index >= 0) {
          items[index] = { ...items[index], ...patch };
          write('ELIUZ_ORDERS', items);
          return items[index];
        }

        return null;
      }
    ).then((payload) => payload.order || payload);
  }

  async function deleteBooking(id, options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';
    return request(
      `/api/bookings/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
  }

  async function getCashEntries(options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';

    return request(
      '/api/cash',
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    ).then((payload) => {
      if (payload && Array.isArray(payload.items)) {
        return payload.items;
      }

      return Array.isArray(payload) ? payload : [];
    });
  }

  async function saveCashEntry(entry, options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';

    return request(
      '/api/cash',
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({
          type: entry.type,
          description: entry.description,
          amount: Number(entry.amount) || 0,
          date: entry.date || todayStr(),
        }),
      }
    ).then((payload) => payload.entry || payload);
  }

  async function deleteCashEntry(id, options = {}) {
    const token = options.token || sessionStorage.getItem('ADMIN_TOKEN') || '';
    return request(
      `/api/cash/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
  }

  async function clearAll() {
    localStorage.removeItem(BOOKING_KEY);
    localStorage.removeItem(CASH_KEY);
  }

  function getServiceCatalog() {
    return SERVICE_CATALOG;
  }

  function getCatalog() {
    return {
      services: SERVICE_CATALOG,
      products: DEFAULT_PRODUCTS,
    };
  }

  return {
    getApiBase,
    getBookings,
    saveBooking,
    deleteBooking,
    getProducts,
    saveProduct,
    getCustomers,
    saveCustomer,
    getMessages,
    saveMessage,
    getOrders,
    saveOrder,
    updateOrder,
    getCashEntries,
    saveCashEntry,
    deleteCashEntry,
    clearAll,
    getServiceCatalog,
    getCatalog,
  };
})();