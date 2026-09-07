document.addEventListener('DOMContentLoaded', () => {
  const storage = window.EliuzStorage;
  const token = sessionStorage.getItem('ADMIN_TOKEN') || '';
  const tableBody = document.getElementById('booking-table-body');
  const customerList = document.getElementById('customer-list');
  const messageList = document.getElementById('message-list');
  const orderList = document.getElementById('order-list');
  const productList = document.getElementById('product-list');
  const filterStart = document.getElementById('filter-start');
  const filterEnd = document.getElementById('filter-end');
  const replyForm = document.getElementById('reply-form');
  const replyThread = document.getElementById('reply-thread');
  const replySubject = document.getElementById('reply-subject');
  const replyMessage = document.getElementById('reply-message');
  const statBookings = document.getElementById('stat-bookings');
  const statCustomers = document.getElementById('stat-customers');
  const statMessages = document.getElementById('stat-messages');
  const statOrders = document.getElementById('stat-orders');

  function formatBRL(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function getDate(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
  }

  function updateAuthUI() {
    const adminControls = document.getElementById('admin-controls');
    if (!adminControls) return;
    adminControls.innerHTML = '';

    if (token) {
      const status = document.createElement('span');
      status.textContent = 'Conectado';
      const button = document.createElement('button');
      button.className = 'btn btn-secondary';
      button.type = 'button';
      button.textContent = 'Sair';
      button.addEventListener('click', () => {
        sessionStorage.removeItem('ADMIN_TOKEN');
        location.href = 'login.html';
      });
      adminControls.appendChild(status);
      adminControls.appendChild(button);
      return;
    }

    const loginLink = document.createElement('a');
    loginLink.className = 'btn btn-secondary';
    loginLink.href = 'login.html';
    loginLink.textContent = 'Login';
    adminControls.appendChild(loginLink);
  }

  async function loadData() {
    const [bookings, customers, messages, orders, products] = await Promise.all([
      storage.getBookings({ scope: 'admin', token }),
      storage.getCustomers({ scope: 'admin', token }),
      storage.getMessages({ scope: 'admin', token }),
      storage.getOrders({ scope: 'admin', token }),
      storage.getProducts({ token }),
    ]);

    return { bookings, customers, messages, orders, products };
  }

  function renderBookings(bookings) {
    if (!tableBody) return;
    const start = filterStart?.value || '';
    const end = filterEnd?.value || '';
    const filtered = bookings.filter((booking) => {
      const date = getDate(booking.date || booking.data || '');
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    });

    tableBody.innerHTML = '';
    filtered.forEach((booking) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <strong>${booking.name || booking.nome || ''}</strong><br>
          <small>${booking.phone || booking.telefone || ''}</small>
        </td>
        <td>${booking.service || booking.servico || ''}</td>
        <td>${booking.date || booking.data || ''}</td>
        <td>${booking.time || booking.horario || ''}</td>
        <td>${booking.notes || booking.observacao || '-'}</td>
      `;

      const actionCell = document.createElement('td');
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn btn-secondary';
      deleteButton.textContent = 'Excluir';
      deleteButton.addEventListener('click', async () => {
        if (!confirm('Excluir este agendamento?')) return;
        try {
          await storage.deleteBooking(booking.id, { token });
          await render();
        } catch (error) {
          alert(error.message || 'Não foi possível excluir o agendamento.');
        }
      });
      actionCell.appendChild(deleteButton);
      row.appendChild(actionCell);
      tableBody.appendChild(row);
    });
  }

  function renderCustomers(customers) {
    if (!customerList) return;
    customerList.innerHTML = '';
    customers.forEach((customer) => {
      const item = document.createElement('div');
      item.className = 'customer-item';
      item.innerHTML = `
        <div>
          <strong>${customer.name || customer.nome || ''}</strong>
          <p>${customer.phone || customer.telefone || ''}</p>
        </div>
        <div>${customer.preferredService || customer.servicoPreferido || '-'}</div>
      `;
      customerList.appendChild(item);
    });
  }

  function renderMessages(messages) {
    if (!messageList) return;
    messageList.innerHTML = '';
    messages.forEach((message) => {
      const item = document.createElement('div');
      item.className = 'message-item';
      const isProfessional = message.sender === 'professional';
      item.innerHTML = `
        <div>
          <strong>${message.subject || (isProfessional ? 'Resposta do profissional' : 'Mensagem do cliente')}</strong>
          <p>${message.message || ''}</p>
          <small>${message.createdAt ? new Date(message.createdAt).toLocaleString('pt-BR') : ''}</small>
        </div>
        <div>${isProfessional ? 'Profissional' : 'Cliente'}</div>
      `;

      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'btn btn-secondary';
      action.textContent = 'Responder';
      action.addEventListener('click', () => {
        replyThread.value = message.threadId || message.customerId || '';
        replySubject.value = message.subject ? `Re: ${message.subject}` : '';
        replyMessage.focus();
      });
      item.appendChild(action);
      messageList.appendChild(item);
    });
  }

  function renderOrders(orders) {
    if (!orderList) return;
    orderList.innerHTML = '';
    orders.forEach((order) => {
      const item = document.createElement('div');
      item.className = 'order-item';
      item.innerHTML = `
        <div>
          <strong>${order.productName || ''}</strong>
          <p>${order.customerName || ''} - ${order.phone || ''}</p>
          <small>${order.notes || '-'}</small>
        </div>
        <div>${formatBRL(order.totalPrice || order.price || 0)}</div>
      `;
      const select = document.createElement('select');
      ['pending', 'confirmed', 'delivered', 'cancelled'].forEach((status) => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        if (status === (order.status || 'pending')) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      select.addEventListener('change', async () => {
        try {
          await storage.updateOrder(order.id, { status: select.value }, { token });
          await render();
        } catch (error) {
          alert(error.message || 'Não foi possível atualizar o pedido.');
        }
      });
      item.appendChild(select);
      orderList.appendChild(item);
    });
  }

  function renderProducts(products) {
    if (!productList) return;
    productList.innerHTML = '';
    products.forEach((product) => {
      const item = document.createElement('div');
      item.className = 'product-item';
      item.innerHTML = `
        <div>
          <strong>${product.name || ''}</strong>
          <p>${product.shortDescription || ''}</p>
        </div>
        <div>${formatBRL(product.price || product.valor || 0)}</div>
      `;
      productList.appendChild(item);
    });
  }

  async function render() {
    const { bookings, customers, messages, orders, products } = await loadData();

    statBookings.textContent = String(bookings.length);
    statCustomers.textContent = String(customers.length);
    statMessages.textContent = String(messages.length);
    statOrders.textContent = String(orders.length);

    renderBookings(bookings);
    renderCustomers(customers);
    renderMessages(messages);
    renderOrders(orders);
    renderProducts(products);
  }

  replyForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const threadId = replyThread.value.trim();
    const subject = replySubject.value.trim();
    const message = replyMessage.value.trim();

    if (!threadId || !message) {
      alert('Informe o cliente e a resposta.');
      return;
    }

    try {
      await storage.saveMessage({
        sender: 'professional',
        threadId,
        subject,
        message,
      }, { token });
      replyMessage.value = '';
      replySubject.value = '';
      await render();
      alert('Resposta enviada.');
    } catch (error) {
      alert(error.message || 'Não foi possível enviar a resposta.');
    }
  });

  filterStart?.addEventListener('change', render);
  filterEnd?.addEventListener('change', render);

  updateAuthUI();
  render();
});