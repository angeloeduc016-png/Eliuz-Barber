document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
  }

  const themeModes = ['system', 'light', 'dark'];
  const themeLabels = { system: 'Tema do dispositivo', light: 'Tema claro', dark: 'Tema escuro' };
  const savedTheme = localStorage.getItem('ELIUZ_THEME') || 'system';

  function applyTheme(mode) {
    if (mode === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-label', themeLabels[mode]);
      button.title = themeLabels[mode];
      button.dataset.themeMode = mode;
    });
  }

  applyTheme(themeModes.includes(savedTheme) ? savedTheme : 'system');
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const current = button.dataset.themeMode || 'system';
      const next = themeModes[(themeModes.indexOf(current) + 1) % themeModes.length];
      localStorage.setItem('ELIUZ_THEME', next);
      applyTheme(next);
    });
  });

  const currentYearNodes = document.querySelectorAll('[data-current-year]');
  currentYearNodes.forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const value = button.dataset.copy || '';
      try {
        await navigator.clipboard.writeText(value);
        const originalLabel = button.getAttribute('aria-label');
        button.setAttribute('aria-label', 'Copiado');
        button.textContent = '✓';
        window.setTimeout(() => {
          button.setAttribute('aria-label', originalLabel || 'Copiar');
          button.textContent = '▢';
        }, 1200);
      } catch (error) {
        window.prompt('Copie o telefone:', value);
      }
    });
  });

  document.querySelectorAll('[data-favorite]').forEach((button) => {
    const isFavorite = localStorage.getItem('ELIUZ_FAVORITE') === 'true';
    button.classList.toggle('is-favorite', isFavorite);
    button.setAttribute('aria-pressed', String(isFavorite));
    button.addEventListener('click', () => {
      const nextValue = !button.classList.contains('is-favorite');
      localStorage.setItem('ELIUZ_FAVORITE', String(nextValue));
      button.classList.toggle('is-favorite', nextValue);
      button.setAttribute('aria-pressed', String(nextValue));
    });
  });

  const revealNodes = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealNodes.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });

    revealNodes.forEach((node) => observer.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add('is-visible'));
  }

  const menuToggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.site-nav');

  if (menuToggle && navigation) {
    const closeMenu = () => {
      navigation.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    };

    menuToggle.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navigation.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 979px)').matches) {
          closeMenu();
        }
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 980) {
        closeMenu();
      }
    });
  }
});