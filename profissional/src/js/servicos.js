document.addEventListener('DOMContentLoaded', () => {
  const storage = window.EliuzStorage;
  const token = sessionStorage.getItem('ADMIN_TOKEN') || '';
  const form = document.getElementById('service-form');
  const list = document.getElementById('service-price-list');
  const feedback = document.getElementById('service-feedback');
  let catalog = {};

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

  function isBeardService(name) {
    return name.toLocaleUpperCase('pt-BR').includes('BARBA');
  }

  function addPriceInput(container, name, label, value, priceType) {
    const wrapper = document.createElement('label');
    wrapper.className = 'service-price-input';
    wrapper.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.required = true;
    input.value = String(Number(value ?? 0));
    input.dataset.service = name;
    input.dataset.priceType = priceType;
    input.setAttribute('aria-label', `${label} para ${name}`);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  }

  function renderServices() {
    list.innerHTML = '';
    Object.entries(catalog).forEach(([name, service]) => {
      const card = document.createElement('article');
      card.className = 'service-price-card';
      const heading = document.createElement('h2');
      heading.textContent = name;
      card.appendChild(heading);
      const inputs = document.createElement('div');
      inputs.className = `service-price-inputs${isBeardService(name) ? ' has-beard-prices' : ''}`;
      if (isBeardService(name)) {
        addPriceInput(inputs, name, 'Gillette (R$)', service.priceGillette ?? service.price, 'priceGillette');
        addPriceInput(inputs, name, 'Máquina (R$)', service.priceMachine ?? service.price, 'priceMachine');
      } else {
        addPriceInput(inputs, name, 'Valor (R$)', service.price, 'price');
      }
      card.appendChild(inputs);
      list.appendChild(card);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.textContent = '';
    feedback.classList.remove('is-error');
    if (!form.reportValidity()) return;

    const updated = Object.fromEntries(Object.entries(catalog).map(([name, service]) => [name, { ...service }]));
    list.querySelectorAll('input[data-service]').forEach((input) => {
      updated[input.dataset.service][input.dataset.priceType] = Number(input.value);
    });

    try {
      catalog = await storage.saveServices(updated, { token });
      renderServices();
      feedback.textContent = 'Valores dos serviços salvos com sucesso.';
    } catch (error) {
      feedback.textContent = error.message || 'Não foi possível salvar os valores.';
      feedback.classList.add('is-error');
    }
  });

  updateAuthUI();
  storage.getServices()
    .then((services) => {
      catalog = services;
      renderServices();
    })
    .catch((error) => {
      feedback.textContent = error.message || 'Não foi possível carregar os serviços.';
      feedback.classList.add('is-error');
    });
});
