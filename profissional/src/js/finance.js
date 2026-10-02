document.addEventListener('DOMContentLoaded', () => {
  const storage = window.EliuzStorage;
  const token = sessionStorage.getItem('ADMIN_TOKEN') || '';
  const totalInEl = document.getElementById('total-in');
  const totalOutEl = document.getElementById('total-out');
  const totalNetEl = document.getElementById('total-net');
  const entriesList = document.getElementById('entries-list');
  const orderList = document.getElementById('finance-order-list');

  function formatBRL(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function loadData() {
    const [bookings, cashEntries, orders] = await Promise.all([
      storage.getBookings({ scope: 'admin', token }),
      storage.getCashEntries({ token }),
      storage.getOrders({ scope: 'admin', token }),
    ]);

    return { bookings, cashEntries, orders };
  }

  function updateAuthUI() {
    const adminControls = document.getElementById('admin-controls');
    if (!adminControls) return;
    adminControls.innerHTML = '';

    if (token) {
      const span = document.createElement('span');
      span.textContent = 'Conectado';
      const button = document.createElement('button');
      button.className = 'btn btn-secondary';
      button.type = 'button';
      button.textContent = 'Sair';
      button.addEventListener('click', () => {
        sessionStorage.removeItem('ADMIN_TOKEN');
        location.href = '../login.html';
      });
      adminControls.appendChild(span);
      adminControls.appendChild(button);
    }
  }

  async function render() {
    const { bookings, cashEntries, orders } = await loadData();

    const bookingIncome = bookings.reduce((sum, booking) => sum + Number(booking.value || booking.valor || 0), 0);
    const manualIncome = cashEntries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const manualExpenses = cashEntries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const totalIn = bookingIncome + manualIncome;
    const totalOut = manualExpenses;

    totalInEl.textContent = formatBRL(totalIn);
    totalOutEl.textContent = formatBRL(totalOut);
    totalNetEl.textContent = formatBRL(totalIn - totalOut);

    entriesList.innerHTML = '';
    cashEntries.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'entry-row';
      item.innerHTML = `
        <div>
          <strong>${entry.description || ''}</strong>
          <p>${entry.date || ''}</p>
        </div>
        <div>${formatBRL(entry.amount || 0)}</div>
      `;
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-secondary';
      deleteButton.type = 'button';
      deleteButton.textContent = 'Excluir';
      deleteButton.addEventListener('click', async () => {
        if (!confirm('Remover lançamento?')) return;
        try {
          await storage.deleteCashEntry(entry.id, { token });
          await render();
        } catch (error) {
          alert(error.message || 'Não foi possível remover o lançamento.');
        }
      });
      item.appendChild(deleteButton);
      entriesList.appendChild(item);
    });

    orderList.innerHTML = '';
    orders.forEach((order) => {
      const item = document.createElement('div');
      item.className = 'order-item';
      item.innerHTML = `
        <div>
          <strong>${order.productName || ''}</strong>
          <p>${order.customerName || ''} - ${order.phone || ''}</p>
        </div>
        <div>${formatBRL(order.totalPrice || order.price || 0)}</div>
      `;
      orderList.appendChild(item);
    });

  }

  document.getElementById('add-entry')?.addEventListener('click', async () => {
    const type = document.getElementById('entry-type').value;
    const desc = document.getElementById('entry-desc').value.trim();
    const amount = Number(String(document.getElementById('entry-amount').value || '0').replace(',', '.'));

    if (!desc || !amount) {
      alert('Preencha descrição e valor.');
      return;
    }

    try {
      await storage.saveCashEntry({ type, description: desc, amount, date: new Date().toISOString().slice(0, 10) }, { token });
      document.getElementById('entry-desc').value = '';
      document.getElementById('entry-amount').value = '';
      await render();
    } catch (error) {
      alert(error.message || 'Não foi possível salvar o lançamento.');
    }
  });

  updateAuthUI();
  render();
});