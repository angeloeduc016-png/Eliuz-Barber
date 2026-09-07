document.addEventListener('DOMContentLoaded', () => {
  const storage = window.EliuzStorage;
  const serviceSelect = document.getElementById('service-select');
  const dateInput = document.getElementById('booking-date');
  const dateStrip = document.getElementById('booking-date-strip');
  const monthLabel = document.getElementById('booking-month-label');
  const previousWeekButton = document.querySelector('[data-date-prev]');
  const nextWeekButton = document.querySelector('[data-date-next]');
  const timeValueInput = document.getElementById('booking-time-value');
  const timeContainer = document.getElementById('booking-time-container');
  const bookingForm = document.getElementById('booking-form');
  const productGrid = document.getElementById('product-grid');
  const orderForm = document.getElementById('order-form');
  const threadForm = document.getElementById('thread-form');
  const threadTimeline = document.getElementById('thread-timeline');
  const threadSearch = document.getElementById('thread-search');
  const threadPhone = document.getElementById('thread-phone');
  const orderProductName = document.getElementById('order-product-name');
  const orderProductId = document.getElementById('order-product-id');
  const orderProductPrice = document.getElementById('order-product-price');
  const orderQuantity = document.getElementById('order-quantity');
  const orderCustomerName = document.getElementById('order-customer-name');
  const orderCustomerPhone = document.getElementById('order-customer-phone');
  const orderNotes = document.getElementById('order-notes');
  const bookingNotes = document.getElementById('booking-notes');
  const bookingNameInput = document.getElementById('booking-name');
  const bookingPhoneInput = document.getElementById('booking-phone');
  const bookingEmailInput = document.getElementById('booking-email');
  const bookingCustomerIdInput = document.getElementById('booking-customer-id');
  const bookingCustomerNameInput = document.getElementById('booking-customer-name');
  const bookingCustomerPhoneInput = document.getElementById('booking-customer-phone');
  const productListSummary = document.getElementById('product-list-summary');
  const bookingWidget = document.getElementById('booking-widget');
  const serviceChoiceGrid = document.getElementById('service-choice-grid');
  const serviceSort = document.getElementById('service-sort');
  const serviceCatalog = storage?.getServiceCatalog ? storage.getServiceCatalog() : {};
  const serviceEntries = Object.entries(serviceCatalog);
  const currentCustomer = { id: '', name: '', phone: '', email: '' };
  const pad = (value) => String(value).padStart(2, '0');

  const today = new Date();
  const minDateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 3);
  if (maxDate.getDate() !== today.getDate()) {
    maxDate.setDate(0);
  }
  const maxDateStr = `${maxDate.getFullYear()}-${pad(maxDate.getMonth() + 1)}-${pad(maxDate.getDate())}`;
  let dateStripStart = new Date(`${minDateStr}T00:00:00`);

  function formatBRL(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function dateToString(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function formatMonth(date) {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
      .format(date)
      .replace(/^./, (letter) => letter.toUpperCase());
  }

  function isDateBeforeMin(date) {
    return dateToString(date) < minDateStr;
  }

  function isDateAfterMax(date) {
    return dateToString(date) > maxDateStr;
  }

  function selectDate(date) {
    if (date.getDay() === 0 || isDateBeforeMin(date) || isDateAfterMax(date)) return;
    const dateString = dateToString(date);
    if (dateInput?._flatpickr) {
      dateInput._flatpickr.setDate(dateString, true);
    } else if (dateInput) {
      dateInput.value = dateString;
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    dateStripStart = new Date(date);
    renderDateStrip();
  }

  function renderDateStrip() {
    if (!dateStrip || !monthLabel) return;
    monthLabel.textContent = formatMonth(dateStripStart);
    dateStrip.innerHTML = '';
    const selectedDate = dateInput?.value || '';
    const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

    Array.from({ length: 7 }, (_, index) => {
      const date = new Date(dateStripStart);
      date.setDate(date.getDate() + index);
      const dateString = dateToString(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'booking-date-day';
      button.innerHTML = `<span>${weekdayFormatter.format(date).replace('.', '')}</span><strong>${pad(date.getDate())}</strong>`;

      const disabled = date.getDay() === 0 || isDateBeforeMin(date) || isDateAfterMax(date);
      if (disabled) {
        button.disabled = true;
        button.classList.add('is-disabled');
      } else {
        button.addEventListener('click', () => selectDate(date));
      }
      if (dateString === selectedDate) button.classList.add('is-selected');
      if (dateString === minDateStr) button.classList.add('is-today');
      dateStrip.appendChild(button);
    });

    const nextStart = new Date(dateStripStart);
    nextStart.setDate(nextStart.getDate() + 7);
    const previousStart = new Date(dateStripStart);
    previousStart.setDate(previousStart.getDate() - 7);
    if (nextWeekButton) nextWeekButton.disabled = isDateAfterMax(nextStart);
    if (previousWeekButton) previousWeekButton.disabled = isDateBeforeMin(previousStart);
  }

  function getTimeOptionsForDate(dateStr) {
    if (!dateStr) return [];
    const date = new Date(`${dateStr}T00:00:00`);
    const day = date.getDay();
    if (day === 0) return [];
    return Array.from({ length: 45 }, (_, index) => {
      const totalMinutes = (8 * 60) + (index * 15);
      return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
    });
  }

  async function getBookings() {
    return storage ? storage.getBookings() : [];
  }

  async function getProducts() {
    return storage ? storage.getProducts() : [];
  }

  async function getCustomers(phone) {
    return storage ? storage.getCustomers({ phone }) : [];
  }

  async function getMessages(phone) {
    return storage ? storage.getMessages({ phone }) : [];
  }

  async function getOrders(phone) {
    return storage ? storage.getOrders({}) : [];
  }

  function setCurrentCustomer(customer) {
    currentCustomer.id = customer?.id || '';
    currentCustomer.name = customer?.name || '';
    currentCustomer.phone = customer?.phone || '';
    currentCustomer.email = customer?.email || '';

    if (bookingNameInput) bookingNameInput.value = currentCustomer.name;
    if (bookingPhoneInput) bookingPhoneInput.value = currentCustomer.phone;
    if (bookingEmailInput) bookingEmailInput.value = currentCustomer.email;
    if (bookingCustomerIdInput) bookingCustomerIdInput.value = currentCustomer.id;
    if (bookingCustomerNameInput) bookingCustomerNameInput.value = currentCustomer.name;
    if (bookingCustomerPhoneInput) bookingCustomerPhoneInput.value = currentCustomer.phone;
    if (orderCustomerName) orderCustomerName.value = currentCustomer.name;
    if (orderCustomerPhone) orderCustomerPhone.value = currentCustomer.phone;
  }

  function renderServiceChoices(entries) {
    if (!serviceChoiceGrid) return;
    serviceChoiceGrid.innerHTML = '';
    entries.forEach(([name, data]) => {
      const button = document.createElement('button');
      button.className = 'service-choice reveal is-visible';
      button.type = 'button';
      button.dataset.openBooking = '';
      button.dataset.serviceChoice = name;
      button.innerHTML = `<span class="service-choice-icon service-icon-${data.icon || 1}" aria-hidden="true"></span><div class="service-choice-copy"><strong>${name}</strong><span>${formatBRL(data.price)} <small>${data.duration} min</small></span></div><b>Agendar</b>`;
      button.addEventListener('click', () => openWidget(name));
      serviceChoiceGrid.appendChild(button);
    });
  }


  function renderServiceOptions() {
    if (!serviceSelect) return;
    serviceSelect.innerHTML = '<option value="">Selecione um serviço</option>';
    serviceEntries.forEach(([name, data]) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = `${name} - ${formatBRL(data.price)} (${data.duration} min)`;
      serviceSelect.appendChild(option);
    });
  }

  function sortServiceEntries() {
    const entries = [...serviceEntries];
    const mode = serviceSort?.value || 'default';
    if (mode === 'price-asc') entries.sort((a, b) => a[1].price - b[1].price || a[0].localeCompare(b[0]));
    if (mode === 'price-desc') entries.sort((a, b) => b[1].price - a[1].price || a[0].localeCompare(b[0]));
    if (mode === 'name-asc') entries.sort((a, b) => a[0].localeCompare(b[0]));
    if (mode === 'name-desc') entries.sort((a, b) => b[0].localeCompare(a[0]));
    renderServiceChoices(entries);
  }

  async function renderTimeOptions() {
    if (!timeContainer || !timeValueInput || !dateInput) return;

    const selectedDate = dateInput.value;
    const bookings = await getBookings();
    const bookedTimes = bookings
      .filter((booking) => (booking.date || booking.data) === selectedDate)
      .map((booking) => booking.time || booking.horario)
      .filter(Boolean);

    timeContainer.innerHTML = '';
    timeValueInput.value = '';

    if (!selectedDate) {
      const placeholder = document.createElement('div');
      placeholder.className = 'hero-callout';
      placeholder.textContent = 'Selecione uma data para ver os horários disponíveis.';
      timeContainer.appendChild(placeholder);
      return;
    }

    const options = getTimeOptionsForDate(selectedDate);
    if (!options.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'hero-callout';
      placeholder.textContent = 'Não há horários disponíveis para este dia.';
      timeContainer.appendChild(placeholder);
      return;
    }

    const isToday = selectedDate === minDateStr;

    const availableTimes = options.filter((time) => {
      if (bookedTimes.includes(time)) return false;
      if (isToday && new Date(`${selectedDate}T${time}:00`) <= new Date()) return false;
      return true;
    });

    if (!availableTimes.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'hero-callout';
      placeholder.textContent = 'Não há horários livres para este dia.';
      timeContainer.appendChild(placeholder);
      return;
    }

    const shifts = [
      { name: 'Manhã', times: availableTimes.filter((time) => time < '12:00') },
      { name: 'Tarde', times: availableTimes.filter((time) => time >= '12:00' && time < '19:00') },
      { name: 'Noite', times: availableTimes.filter((time) => time >= '19:00') },
    ];

    shifts.forEach((shift) => {
      if (!shift.times.length) return;

      const shiftSection = document.createElement('section');
      shiftSection.className = 'booking-time-shift';
      shiftSection.innerHTML = `<div class="booking-time-shift-heading"><strong>${shift.name}</strong><small>${shift.times.length} horários</small></div>`;

      const shiftGrid = document.createElement('div');
      shiftGrid.className = 'booking-time-grid';
      shift.times.forEach((time) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'time-btn';
        button.textContent = time;
        button.addEventListener('click', () => {
          timeContainer.querySelectorAll('.time-btn').forEach((item) => item.classList.remove('selected'));
          button.classList.add('selected');
          timeValueInput.value = time;
          button.remove();
        });
        shiftGrid.appendChild(button);
      });

      shiftSection.appendChild(shiftGrid);
      timeContainer.appendChild(shiftSection);
    });
  }

  async function renderProducts() {
    if (!productGrid) return;

    const products = await getProducts();
    productGrid.innerHTML = '';

    if (!products.length) {
      const empty = document.createElement('div');
      empty.className = 'hero-callout';
      empty.textContent = 'Nenhum produto cadastrado no momento.';
      productGrid.appendChild(empty);
      return;
    }

    products.forEach((product) => {
      const card = document.createElement('article');
      card.className = 'product-card reveal is-visible';
      card.innerHTML = `
        <img src="${product.imageUrl || '../images/social.jpg'}" alt="${product.name || 'Produto'}">
        <span class="eyebrow">${product.category || 'Produto'}</span>
        <h3>${product.name || ''}</h3>
        <p>${product.shortDescription || product.description || ''}</p>
        <div class="hero-callout">
          <strong class="product-price">${formatBRL(product.price)}</strong>
          <span>${product.stock || 'Sob consulta'}</span>
        </div>
        <button type="button" class="btn btn-secondary" data-product-id="${product.id}">Quero este produto</button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        if (orderProductId) orderProductId.value = product.id;
        if (orderProductName) orderProductName.value = product.name || '';
        if (orderProductPrice) orderProductPrice.value = String(Number(product.price || 0));
        if (orderCustomerName && currentCustomer.name) orderCustomerName.value = currentCustomer.name;
        if (orderCustomerPhone && currentCustomer.phone) orderCustomerPhone.value = currentCustomer.phone;
        orderProductName?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      productGrid.appendChild(card);
    });
  }

  function renderThread(items, bookings, orders) {
    if (!threadTimeline) return;
    threadTimeline.innerHTML = '';

    if (!items.length && !bookings.length && !orders.length) {
      const empty = document.createElement('div');
      empty.className = 'hero-callout';
      empty.textContent = 'Nenhum registro encontrado para este telefone.';
      threadTimeline.appendChild(empty);
      return;
    }

    bookings.forEach((booking) => {
      const row = document.createElement('div');
      row.className = 'timeline-item';
      row.innerHTML = `
        <div>
          <strong>${booking.service || booking.servico || 'Agendamento'}</strong>
          <p>${booking.date || booking.data || ''} às ${booking.time || booking.horario || ''}</p>
        </div>
        <div>${formatBRL(booking.value || booking.valor || 0)}</div>
      `;
      threadTimeline.appendChild(row);
    });

    orders.forEach((order) => {
      const row = document.createElement('div');
      row.className = 'order-item';
      row.innerHTML = `
        <div>
          <strong>${order.productName || 'Pedido de produto'}</strong>
          <p>${order.status || 'pending'} - ${order.notes || ''}</p>
        </div>
        <div>${formatBRL(order.totalPrice || order.price || 0)}</div>
      `;
      threadTimeline.appendChild(row);
    });

    items.forEach((message) => {
      const row = document.createElement('div');
      row.className = 'message-item';
      row.innerHTML = `
        <div>
          <strong>${message.subject || (message.sender === 'professional' ? 'Resposta do profissional' : 'Mensagem do cliente')}</strong>
          <p>${message.message || ''}</p>
        </div>
        <div>${message.sender === 'professional' ? 'Profissional' : 'Cliente'}</div>
      `;
      threadTimeline.appendChild(row);
    });
  }

  async function refreshThread(phone) {
    if (!phone) return;
    const cleanPhone = phone.trim();
    const customerList = await getCustomers(cleanPhone);
    const customer = customerList.find((item) => String(item.phone || '').replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''));
    if (customer) {
      setCurrentCustomer(customer);
    }

    const bookings = (await getBookings()).filter((booking) => String(booking.phone || booking.telefone || '').replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''));
    const messages = await getMessages(cleanPhone);
    const orders = (await getOrders(cleanPhone)).filter((order) => String(order.phone || '').replace(/\D/g, '') === cleanPhone.replace(/\D/g, ''));
    renderThread(messages, bookings, orders);
  }

  function getBookingPayload() {
    if (!bookingForm?.reportValidity()) {
      return null;
    }

    const name = bookingNameInput?.value.trim() || '';
    const phone = bookingPhoneInput?.value.trim() || '';
    const email = bookingEmailInput?.value.trim() || '';
    const service = serviceSelect?.value || '';
    const date = dateInput?.value || '';
    const time = timeValueInput?.value || '';
    const notes = bookingNotes?.value.trim() || '';
    const price = serviceCatalog[service]?.price || 0;

    if (!name || !phone || !service || !date || !time) {
      return null;
    }

    return {
      name,
      phone,
      email,
      service,
      date,
      time,
      notes,
      value: price,
      customerId: bookingCustomerIdInput?.value || currentCustomer.id || '',
    };
  }

  function openWidget(serviceName = '') {
    if (!bookingWidget) return;
    if (window.EliuzAuth && !window.EliuzAuth.getCustomer()) {
      window.EliuzAuth.requireAuth(() => openWidget(serviceName));
      return;
    }
    if (serviceName && serviceSelect) serviceSelect.value = serviceName;
    if (dateInput && !dateInput.value) selectDate(new Date(`${minDateStr}T00:00:00`));
    renderDateStrip();
    if (typeof bookingWidget.showModal === 'function') {
      bookingWidget.showModal();
      return;
    }

    bookingWidget.classList.add('is-open');
  }

  function closeWidget() {
    if (!bookingWidget) return;
    if (typeof bookingWidget.close === 'function') {
      bookingWidget.close();
      return;
    }

    bookingWidget.classList.remove('is-open');
  }

  if (dateInput) {
    dateInput.setAttribute('aria-describedby', 'date-help');
    if (window.flatpickr) {
      flatpickr(dateInput, {
        altInput: true,
        altFormat: 'd/m/Y',
        dateFormat: 'Y-m-d',
        minDate: minDateStr,
        maxDate: maxDateStr,
        disable: [function(date) { return date.getDay() === 0; }],
        locale: 'pt',
        onChange: renderTimeOptions,
      });
    } else {
      dateInput.min = minDateStr;
      dateInput.max = maxDateStr;
    }
  }

  previousWeekButton?.addEventListener('click', () => {
    if (previousWeekButton.disabled) return;
    dateStripStart.setDate(dateStripStart.getDate() - 7);
    renderDateStrip();
  });

  nextWeekButton?.addEventListener('click', () => {
    if (nextWeekButton.disabled) return;
    dateStripStart.setDate(dateStripStart.getDate() + 7);
    renderDateStrip();
  });

  serviceSort?.addEventListener('change', sortServiceEntries);

  window.addEventListener('eliuz:authenticated', openWidget);

  bookingWidget?.addEventListener('click', (event) => {
    if (event.target === bookingWidget) {
      closeWidget();
    }
  });

  bookingWidget?.addEventListener('close', () => {
    bookingWidget.classList.remove('is-open');
  });

  bookingForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = getBookingPayload();
    if (!payload) {
      alert('Preencha todos os campos do agendamento.');
      return;
    }

    try {
      const savedCustomer = await storage.saveCustomer({
        id: currentCustomer.id,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        preferredService: payload.service,
        notes: payload.notes,
      });
      setCurrentCustomer(savedCustomer);

      const result = await storage.saveBooking({ ...payload, customerId: savedCustomer.id });
      if (!result.ok) {
        alert('Esse horário já está ocupado. Escolha outro.');
        return;
      }

      bookingForm.reset();
      bookingNotes && (bookingNotes.value = '');
      timeValueInput && (timeValueInput.value = '');
      if (dateInput && dateInput._flatpickr) {
        dateInput._flatpickr.clear();
      } else if (dateInput) {
        dateInput.value = '';
      }
      await renderTimeOptions();
      await refreshThread(savedCustomer.phone);
      alert('Agendamento salvo com sucesso.');
    } catch (error) {
      alert(error.message || 'Não foi possível salvar o agendamento.');
    }
  });

  orderForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!orderProductId?.value || !orderProductName?.value || !orderCustomerName?.value || !orderCustomerPhone?.value) {
      alert('Escolha um produto e preencha seus dados antes de enviar o pedido.');
      return;
    }

    try {
      const savedCustomer = await storage.saveCustomer({
        id: currentCustomer.id,
        name: orderCustomerName.value.trim(),
        phone: orderCustomerPhone.value.trim(),
        email: bookingEmailInput?.value.trim() || '',
      });
      setCurrentCustomer(savedCustomer);

      await storage.saveOrder({
        customerId: savedCustomer.id,
        customerName: savedCustomer.name,
        phone: savedCustomer.phone,
        productId: orderProductId.value,
        productName: orderProductName.value.trim(),
        quantity: Number(orderQuantity?.value || 1),
        notes: orderNotes?.value.trim() || '',
        price: Number(orderProductPrice?.value || 0),
        totalPrice: Number(orderProductPrice?.value || 0) * Number(orderQuantity?.value || 1),
      });

      const productName = orderProductName.value;
      orderForm.reset();
      if (orderProductName) orderProductName.value = '';
      if (orderProductId) orderProductId.value = '';
      if (orderProductPrice) orderProductPrice.value = '';
      if (orderQuantity) orderQuantity.value = '1';
      await refreshThread(savedCustomer.phone);
      alert('Pedido enviado com sucesso.');
    } catch (error) {
      alert(error.message || 'Não foi possível enviar o pedido.');
    }
  });

  threadForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const phone = threadPhone?.value.trim() || bookingPhoneInput?.value.trim() || currentCustomer.phone;
    if (!phone) {
      alert('Informe o telefone para localizar sua conversa.');
      return;
    }
    try {
      await refreshThread(phone);
    } catch (error) {
      alert(error.message || 'Não foi possível carregar o histórico.');
    }
  });

  threadSearch?.addEventListener('click', async () => {
    const phone = threadPhone?.value.trim();
    if (!phone) {
      alert('Informe o telefone para consultar o histórico.');
      return;
    }
    await refreshThread(phone);
  });

  threadPhone?.addEventListener('change', async () => {
    const phone = threadPhone.value.trim();
    if (phone) {
      await refreshThread(phone);
    }
  });

  serviceSelect?.addEventListener('change', renderTimeOptions);
  dateInput?.addEventListener('change', renderTimeOptions);
  bookingPhoneInput?.addEventListener('change', async () => {
    if (bookingPhoneInput.value.trim()) {
      await refreshThread(bookingPhoneInput.value.trim());
    }
  });
  renderServiceOptions();
  renderDateStrip();
  sortServiceEntries();
  renderTimeOptions();
  renderProducts();
  const authenticatedCustomer = window.EliuzAuth?.getCustomer();
  if (authenticatedCustomer) setCurrentCustomer(authenticatedCustomer);
  if (productListSummary) {
    productListSummary.textContent = 'Escolha um produto e envie um pedido direto para o profissional.';
  }
});