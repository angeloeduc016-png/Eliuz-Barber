document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('booking-form');
  const serviceSelect = document.getElementById('service-select');
  const dateInput = document.getElementById('booking-date');
  const timeValueInput = document.getElementById('booking-time-value');
  const timeContainer = document.getElementById('booking-time-container');
  const agenda = document.getElementById('agenda');
  const storage = window.EliuzStorage;
  const serviceCatalog = storage?.getServiceCatalog ? storage.getServiceCatalog() : {};

  const servicePrices = Object.fromEntries(
    Object.entries(serviceCatalog).map(([name, data]) => [name, data.price])
  );

  const pad = (n) => String(n).padStart(2, '0');
  const today = new Date();
  const minDateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 3);
  if (maxDate.getDate() !== today.getDate()) {
    maxDate.setDate(0);
  }
  const maxDateStr = `${maxDate.getFullYear()}-${pad(maxDate.getMonth() + 1)}-${pad(maxDate.getDate())}`;

  const getBookings = async () => (storage ? storage.getBookings() : []);

  const getTimeOptionsForDate = (dateStr) => {
    if (!dateStr) return [];

    const date = new Date(`${dateStr}T00:00:00`);
    const day = date.getDay();
    if (day === 0) return [];

    if (day >= 1 && day <= 5) {
      return ['17:00', '18:00', '19:00', '20:00'];
    }

    const times = [];
    for (let hour = 8; hour <= 20; hour += 1) {
      times.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return times;
  };

  const getBookingFromForm = () => {
    if (!form.reportValidity()) {
      return null;
    }

    const name = document.getElementById('booking-name').value.trim();
    const phone = document.getElementById('booking-phone').value.trim();
    const service = serviceSelect.value;
    const value = servicePrices[service];
    const date = dateInput.value;
    const time = timeValueInput ? timeValueInput.value : '';

    if (!name || !phone || !service || !time || typeof value !== 'number') {
      return null;
    }

    return { name, phone, service, value, date, time };
  };

  const renderAgenda = async () => {
    if (!agenda) return;

    agenda.innerHTML = '';
    const bookings = await getBookings();

    if (!bookings.length) {
      const message = document.createElement('div');
      message.textContent = 'Nenhum horário reservado ainda.';
      agenda.appendChild(message);
      return;
    }

    bookings.forEach((booking) => {
      const data = booking.data || booking.date || '';
      const horario = booking.horario || booking.time || '';
      const servico = booking.servico || booking.service || '';
      const [year, month, day] = String(data).split('-');
      const item = document.createElement('div');
      item.textContent = `${day}/${month}/${year} - ${horario} - ${servico}`;
      agenda.appendChild(item);
    });
  };

  const renderTimeOptions = async () => {
    if (!timeContainer) return;

    const selectedDate = dateInput.value;
    const bookings = await getBookings();
    const bookedTimes = bookings
      .filter((booking) => (booking.date || booking.data) === selectedDate)
      .map((booking) => booking.time || booking.horario);

    timeContainer.innerHTML = '';
    timeValueInput.value = '';

    const options = getTimeOptionsForDate(selectedDate);
    const isToday = selectedDate === minDateStr;

    if (!selectedDate) {
      const placeholder = document.createElement('div');
      placeholder.className = 'time-help-empty';
      placeholder.textContent = 'Selecione uma data para ver os horários disponíveis.';
      timeContainer.appendChild(placeholder);
      return;
    }

    if (!options.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'time-help-empty';
      placeholder.textContent = 'Não há horários disponíveis para este dia.';
      timeContainer.appendChild(placeholder);
      return;
    }

    options.forEach((time) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-btn';
      button.dataset.time = time;
      button.textContent = time;

      let disabled = bookedTimes.includes(time);
      if (!disabled && isToday) {
        const candidate = new Date(`${selectedDate}T${time}:00`);
        if (candidate <= new Date()) {
          disabled = true;
        }
      }

      if (disabled) {
        button.classList.add('disabled');
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      } else {
        button.addEventListener('click', () => {
          timeContainer.querySelectorAll('.time-btn').forEach((item) => item.classList.remove('selected'));
          button.classList.add('selected');
          timeValueInput.value = time;
        });
      }

      timeContainer.appendChild(button);
    });
  };

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
        onChange: function() {
          renderTimeOptions();
        }
      });
    } else {
      dateInput.min = minDateStr;
      dateInput.max = maxDateStr;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const booking = getBookingFromForm();
    if (!booking) {
      alert('Por favor, preencha todos os campos antes de enviar.');
      return;
    }

    if (!storage) {
      alert('Falha ao inicializar o armazenamento local.');
      return;
    }

    try {
      const result = await storage.saveBooking(booking);
      if (!result.ok) {
        alert('Esse horário já está ocupado. Escolha outro.');
        return;
      }

      form.reset();
      if (timeValueInput) {
        timeValueInput.value = '';
      }
      if (dateInput && dateInput._flatpickr) {
        dateInput._flatpickr.clear();
      } else if (dateInput) {
        dateInput.value = '';
      }

      await renderAgenda();
      await renderTimeOptions();
      alert(result.notificationSent ? 'Agendamento salvo e notificação enviada.' : 'Agendamento salvo.');
    } catch (error) {
      alert(error.message || 'Não foi possível salvar o agendamento.');
    }
  });

  renderAgenda();
  renderTimeOptions();
  dateInput?.addEventListener('change', renderTimeOptions);
  serviceSelect?.addEventListener('change', renderTimeOptions);
});