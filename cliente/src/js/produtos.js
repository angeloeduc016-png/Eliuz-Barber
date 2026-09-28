document.addEventListener('DOMContentLoaded', () => {
  const storage = window.EliuzStorage;
  const productGrid = document.getElementById('product-list');
  const searchInput = document.getElementById('product-search');
  const sortButtons = document.querySelectorAll('[data-product-sort]');
  let products = [];
  let sortMode = 'name';

  function formatBRL(value) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function renderProducts() {
    const searchTerm = (searchInput?.value || '').trim().toLocaleLowerCase('pt-BR');
    const filteredProducts = products
      .filter((product) => product.ativo !== false)
      .filter((product) => `${product.name || product.nome || ''} ${product.category || product.categoria || ''}`.toLocaleLowerCase('pt-BR').includes(searchTerm))
      .sort((first, second) => {
        const firstName = first.name || first.nome || '';
        const secondName = second.name || second.nome || '';
        if (sortMode === 'price') return Number(first.price ?? first.valor ?? 0) - Number(second.price ?? second.valor ?? 0) || firstName.localeCompare(secondName, 'pt-BR');
        return firstName.localeCompare(secondName, 'pt-BR');
      });

    productGrid.innerHTML = '';
    if (!filteredProducts.length) {
      const empty = document.createElement('p');
      empty.className = 'product-list-empty';
      empty.textContent = 'Nenhum produto encontrado.';
      productGrid.appendChild(empty);
      return;
    }

    filteredProducts.forEach((product) => {
      const name = product.name || product.nome || 'Produto';
      const imageUrl = product.imageUrl || product.foto || product.image || '../images/social.jpg';
      const descriptionText = (product.shortDescription || product.description || '')
        .replace(/\s*disponível na Eliuz Barber\.?/gi, '')
        .trim();
      const card = document.createElement('article');
      card.className = 'product-list-card reveal is-visible';
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = name;
      image.loading = 'lazy';
      image.addEventListener('error', () => {
        image.src = '../images/social.jpg';
      }, { once: true });

      const copy = document.createElement('div');
      copy.className = 'product-list-card-copy';
      const title = document.createElement('h2');
      title.textContent = name;
      const price = document.createElement('strong');
      price.textContent = formatBRL(product.price ?? product.valor ?? 0);

      copy.append(title);
      if (descriptionText) {
        const description = document.createElement('p');
        description.textContent = descriptionText;
        copy.append(description);
      }
      copy.append(price);
      card.append(image, copy);
      productGrid.appendChild(card);
    });
  }

  function renderMessage(message) {
    productGrid.innerHTML = '';
    const state = document.createElement('p');
    state.className = 'product-list-empty';
    state.textContent = message;
    productGrid.appendChild(state);
  }

  async function loadProducts() {
    renderMessage('Carregando produtos...');
    try {
      if (!storage?.getProducts) throw new Error('Catálogo indisponível.');
      products = await storage.getProducts();
      renderProducts();
    } catch (error) {
      renderMessage('Não foi possível carregar os produtos. Tente novamente mais tarde.');
    }
  }

  searchInput?.addEventListener('input', renderProducts);
  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      sortMode = button.dataset.productSort;
      sortButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      renderProducts();
    });
  });

  loadProducts();
});
