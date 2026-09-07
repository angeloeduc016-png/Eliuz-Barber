document.addEventListener('DOMContentLoaded', () => {
  const storage = window.EliuzStorage;
  const token = sessionStorage.getItem('ADMIN_TOKEN') || '';
  const list = document.getElementById('customer-list');
  const detail = document.getElementById('customer-detail');
  const search = document.getElementById('customer-search');
  const total = document.getElementById('customer-total');
  const contactable = document.getElementById('customer-contactable');
  const active = document.getElementById('customer-active');
  let customers = [];
  let bookings = [];
  let selectedId = '';

  const valueOf = (customer, ...keys) => keys.map((key) => customer?.[key]).find((value) => value) || '';
  const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');
  const formatDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '-';

  function updateAuthUI() {
    const controls = document.getElementById('admin-controls');
    if (!controls) return;
    controls.innerHTML = '<span class="connection-status"><i></i>Conectado</span>';
    const button = document.createElement('button');
    button.className = 'btn btn-secondary';
    button.type = 'button';
    button.textContent = 'Sair';
    button.addEventListener('click', () => {
      sessionStorage.removeItem('ADMIN_TOKEN');
      location.href = '../login.html';
    });
    controls.appendChild(button);
  }

  function customerBookings(customer) {
    const phone = normalizePhone(valueOf(customer, 'phone', 'telefone'));
    const id = valueOf(customer, 'id');
    return bookings.filter((booking) => {
      const bookingPhone = normalizePhone(valueOf(booking, 'phone', 'telefone'));
      return (id && valueOf(booking, 'customerId', 'clienteId') === id) || (phone && bookingPhone === phone);
    }).sort((a, b) => String(valueOf(b, 'date', 'data')).localeCompare(String(valueOf(a, 'date', 'data'))));
  }

  function renderDetail(customer) {
    if (!detail || !customer) return;
    const name = valueOf(customer, 'name', 'nome') || 'Cliente sem nome';
    const phone = valueOf(customer, 'phone', 'telefone');
    const email = valueOf(customer, 'email');
    const service = valueOf(customer, 'preferredService', 'servicoPreferido');
    const history = customerBookings(customer);
    detail.innerHTML = `
      <div class="detail-heading"><span class="avatar">${name.charAt(0).toUpperCase()}</span><div><span class="eyebrow">Perfil</span><h3>${name}</h3></div></div>
      <dl class="customer-contact"><div><dt>Telefone</dt><dd>${phone || 'Não informado'}</dd></div><div><dt>E-mail</dt><dd>${email || 'Não informado'}</dd></div><div><dt>Serviço preferido</dt><dd>${service || 'Ainda não definido'}</dd></div></dl>
      <div class="detail-history"><span class="eyebrow">Histórico</span><h4>${history.length} atendimento${history.length === 1 ? '' : 's'}</h4>${history.length ? `<ul>${history.slice(0, 5).map((booking) => `<li><span>${formatDate(valueOf(booking, 'date', 'data'))}</span><strong>${valueOf(booking, 'service', 'servico') || 'Serviço'}</strong><small>${valueOf(booking, 'time', 'horario') || ''}</small></li>`).join('')}</ul>` : '<p class="muted-copy">Nenhum agendamento encontrado para este cadastro.</p>'}</div>
      ${phone ? `<a class="btn btn-primary detail-action" href="https://wa.me/55${normalizePhone(phone)}" target="_blank" rel="noreferrer">Abrir WhatsApp</a>` : ''}
    `;
  }

  function renderList() {
    const term = search.value.trim().toLocaleLowerCase('pt-BR');
    const filtered = customers.filter((customer) => [valueOf(customer, 'name', 'nome'), valueOf(customer, 'phone', 'telefone'), valueOf(customer, 'email')].join(' ').toLocaleLowerCase('pt-BR').includes(term));
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state"><span class="eyebrow">Busca</span><h3>Nenhum cliente encontrado</h3><p>Tente outro nome, telefone ou e-mail.</p></div>';
      return;
    }
    filtered.forEach((customer) => {
      const id = valueOf(customer, 'id') || valueOf(customer, 'phone', 'telefone');
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `customer-directory-item${id === selectedId ? ' is-selected' : ''}`;
      item.innerHTML = `<span class="avatar">${(valueOf(customer, 'name', 'nome') || '?').charAt(0).toUpperCase()}</span><span><strong>${valueOf(customer, 'name', 'nome') || 'Cliente sem nome'}</strong><small>${valueOf(customer, 'phone', 'telefone') || valueOf(customer, 'email') || 'Sem contato informado'}</small></span><span class="directory-count">${customerBookings(customer).length}</span>`;
      item.addEventListener('click', () => { selectedId = id; renderList(); renderDetail(customer); });
      list.appendChild(item);
    });
  }

  async function render() {
    [customers, bookings] = await Promise.all([
      storage.getCustomers({ scope: 'admin', token }),
      storage.getBookings({ scope: 'admin', token }),
    ]);
    total.textContent = String(customers.length);
    contactable.textContent = String(customers.filter((customer) => valueOf(customer, 'phone', 'telefone') || valueOf(customer, 'email')).length);
    active.textContent = String(customers.filter((customer) => customerBookings(customer).length).length);
    renderList();
    const selected = customers.find((customer) => (valueOf(customer, 'id') || valueOf(customer, 'phone', 'telefone')) === selectedId);
    if (selected) renderDetail(selected);
  }

  search.addEventListener('input', renderList);
  updateAuthUI();
  render().catch((error) => {
    list.innerHTML = `<div class="empty-state"><h3>Não foi possível carregar a base</h3><p>${error.message || 'Verifique a conexão com a API.'}</p></div>`;
  });
});
