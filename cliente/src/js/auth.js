document.addEventListener('DOMContentLoaded', () => {
  const storage = window.EliuzStorage;
  const AUTH_KEY = 'ELIUZ_AUTH_CUSTOMER';
  const state = { customer: readCustomer(), afterAuth: null };

  function getApiBase() {
    return storage?.getApiBase ? storage.getApiBase() : '/api';
  }

  async function restoreOAuthSession() {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('auth');
    if (!result) return;
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);
    if (result === 'error') {
      setFeedback(params.get('message') || 'Não foi possível concluir o login.', true);
      return;
    }

    try {
      const response = await fetch(`${getApiBase()}/auth/session`, { credentials: 'include' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Sessão não encontrada.');
      writeCustomer(payload.customer);
      setFeedback('Login realizado com sucesso.');
      if (sessionStorage.getItem('ELIUZ_PENDING_AUTH') === 'booking') {
        sessionStorage.removeItem('ELIUZ_PENDING_AUTH');
        window.dispatchEvent(new CustomEvent('eliuz:authenticated'));
      }
    } catch (error) {
      setFeedback(error.message || 'Não foi possível restaurar sua sessão.', true);
    }
  }

  function readCustomer() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    } catch (error) {
      return null;
    }
  }

  function writeCustomer(customer) {
    state.customer = customer;
    localStorage.setItem(AUTH_KEY, JSON.stringify(customer));
    updateAccountButton();
  }

  function getCustomer() {
    return state.customer;
  }

  function createAccountUI() {
    const header = document.querySelector('.nav-shell');
    if (!header) return;

    const accountButton = document.createElement('button');
    accountButton.className = 'account-trigger';
    accountButton.type = 'button';
    accountButton.setAttribute('aria-haspopup', 'dialog');
    accountButton.addEventListener('click', () => openAccount());
    header.appendChild(accountButton);

    const dialog = document.createElement('dialog');
    dialog.id = 'account-widget';
    dialog.className = 'account-widget';
    dialog.innerHTML = `
      <div class="account-widget-shell">
        <button class="account-widget-close" type="button" aria-label="Fechar">&times;</button>
        <div class="account-widget-header">
          <span class="eyebrow">Área do cliente</span>
          <h2 id="account-title">Acesse sua conta</h2>
          <p id="account-subtitle">Entre para agendar seu horário com seus dados protegidos.</p>
        </div>
        <div class="account-providers" aria-label="Opções de acesso social">
          <button type="button" class="provider-button" data-provider="Google"><strong class="provider-icon google">G</strong> Google</button>
          <!-- <button type="button" class="provider-button" data-provider="Facebook"><strong class="provider-icon facebook">f</strong> Facebook</button> -->
        </div>
        <div class="account-divider"><span>ou continue com seus dados</span></div>
        <div class="account-tabs" role="tablist">
          <button type="button" class="account-tab is-active" data-account-mode="login">Entrar</button>
          <button type="button" class="account-tab" data-account-mode="register">Criar conta</button>
        </div>
        <form id="account-login-form" class="account-form">
          <label>E-mail ou telefone<input id="account-login-identity" type="text" autocomplete="username" required placeholder="seu@email.com ou (XX) XXXXX-XXXX"></label>
          <label>Senha<input id="account-login-password" type="password" autocomplete="current-password" minlength="8" required placeholder="Sua senha"></label>
          <button class="btn btn-primary" type="submit">Entrar</button>
        </form>
        <form id="account-register-form" class="account-form is-hidden">
          <label>Nome completo<input id="account-name" type="text" autocomplete="name" required placeholder="Seu nome completo"></label>
          <label>Telefone<input id="account-phone" type="tel" autocomplete="tel" required placeholder="(XX) XXXXX-XXXX"></label>
          <label>Gmail ou e-mail<input id="account-email" type="email" autocomplete="email" required placeholder="seuemail@gmail.com"></label>
          <label>Senha<input id="account-password" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo de 8 caracteres"></label>
          <button class="btn btn-primary" type="submit">Criar conta</button>
        </form>
        <p id="account-feedback" class="account-feedback" role="status"></p>
        <small class="account-legal">Ao continuar, você concorda com o termo de uso e com o tratamento dos seus dados para atendimento.</small>
      </div>`;
    document.body.appendChild(dialog);

    dialog.querySelector('.account-widget-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelectorAll('[data-account-mode]').forEach((tab) => {
      tab.addEventListener('click', () => setMode(tab.dataset.accountMode));
    });
    dialog.querySelectorAll('[data-provider]').forEach((button) => {
      button.addEventListener('click', () => startProviderLogin(button.dataset.provider.toLowerCase()));
    });
    dialog.querySelector('#account-login-form').addEventListener('submit', handleLogin);
    dialog.querySelector('#account-register-form').addEventListener('submit', handleRegister);
    updateAccountButton();
  }

  async function startProviderLogin(provider) {
    setFeedback('Conectando com o provedor...');
    try {
      const response = await fetch(`${getApiBase()}/auth/providers`, { credentials: 'include' });
      const payload = await response.json();
      if (!payload.providers?.[provider]) {
        throw new Error(`O login com ${provider} ainda não foi configurado no backend.`);
      }
      const startUrl = new URL(`${getApiBase()}/auth/${provider}/start`, window.location.href);
      startUrl.searchParams.set('return_to', window.location.href);
      window.location.assign(startUrl.toString());
    } catch (error) {
      setFeedback(error.message || 'Não foi possível iniciar o login.', true);
    }
  }

  function updateAccountButton() {
    const button = document.querySelector('.account-trigger');
    if (!button) return;
    button.textContent = state.customer ? `Olá, ${state.customer.name.split(' ')[0]}` : 'Acessar conta';
    button.classList.toggle('is-authenticated', Boolean(state.customer));
  }

  function setMode(mode) {
    const dialog = document.getElementById('account-widget');
    if (!dialog) return;
    dialog.querySelectorAll('[data-account-mode]').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.accountMode === mode));
    dialog.querySelector('#account-login-form').classList.toggle('is-hidden', mode !== 'login');
    dialog.querySelector('#account-register-form').classList.toggle('is-hidden', mode !== 'register');
    dialog.querySelector('#account-title').textContent = mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta';
    dialog.querySelector('#account-subtitle').textContent = mode === 'login' ? 'Entre para agendar seu horário com seus dados protegidos.' : 'Leva menos de um minuto: só precisamos do essencial.';
    setFeedback('');
  }

  function setFeedback(message, isError = false) {
    const feedback = document.getElementById('account-feedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.toggle('is-error', isError);
  }

  async function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const customer = {
      name: form.querySelector('#account-name').value.trim(),
      phone: form.querySelector('#account-phone').value.trim(),
      email: form.querySelector('#account-email').value.trim(),
      password: form.querySelector('#account-password').value,
    };
    try {
      const response = await fetch(`${getApiBase()}/auth/customer/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Não foi possível criar sua conta.');
      writeCustomer(payload.customer);
      setFeedback('Conta criada com sucesso.');
      finishAuthentication();
    } catch (error) {
      setFeedback(error.message || 'Não foi possível criar sua conta.', true);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const identity = event.currentTarget.querySelector('#account-login-identity').value.trim();
    const password = event.currentTarget.querySelector('#account-login-password').value;
    try {
      const response = await fetch(`${getApiBase()}/auth/customer/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'E-mail, telefone ou senha inválidos.');
      writeCustomer(payload.customer);
      setFeedback('Login realizado com sucesso.');
      finishAuthentication();
    } catch (error) {
      setFeedback(error.message || 'Não foi possível entrar.', true);
    }
  }

  function finishAuthentication() {
    const callback = state.afterAuth;
    state.afterAuth = null;
    window.setTimeout(() => {
      document.getElementById('account-widget')?.close();
      callback?.(state.customer);
    }, 350);
  }

  function openAccount(afterAuth) {
    const dialog = document.getElementById('account-widget');
    if (!dialog) return;
    state.afterAuth = afterAuth || null;
    if (afterAuth) sessionStorage.setItem('ELIUZ_PENDING_AUTH', 'booking');
    setMode('login');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.classList.add('is-open');
  }

  window.EliuzAuth = { getCustomer, openAccount, requireAuth: (callback) => state.customer ? callback(state.customer) : openAccount(callback) };
  createAccountUI();
  restoreOAuthSession();
});
