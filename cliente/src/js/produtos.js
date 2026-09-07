document.addEventListener('DOMContentLoaded', () => {
  const productGrid = document.getElementById('product-list');
  const searchInput = document.getElementById('product-search');
  const sortButtons = document.querySelectorAll('[data-product-sort]');

  const products = [
    ['Ampola minoxidil', 15, 'ampola_minoxidil.PNG'],
    ['Balm', 25, 'balm.PNG'],
    ['Elixir estimulante capilar', 45, 'elixir.PNG'],
    ['Gel fixador', 25, 'gel_fixador.PNG'],
    ['Grooming', 25, 'grooming.PNG'],
    ['Leave-in', 25, 'leave-in.PNG'],
    ['Óleo barba', 30, 'oleo_barba.PNG'],
    ['Pomada black', 25, 'pomada_black.PNG'],
    ['Pomada caramelo brilho', 20, 'pomada_caramelo.PNG'],
    ['Pomada em pó', 25, 'pomada_em_po.PNG'],
    ['Pomada matte', 20, 'pomada_matte.PNG'],
    ['Pomada semi brilho', 20, 'pomada_semi_brilho.PNG'],
    ['Pomada super matte', 20, 'pomada_super_matte.PNG'],
    ['Pomada teia', 20, 'pomada_teia.PNG'],
    ['Pomada teia 120g', 25, 'pomada_teia_120g.PNG'],
    ['Shampoo crescimento e fortalecimento', 28, 'shampoo_fortalecimento.PNG'],
    ['Shampoo desintoxicante', 28, 'shampoo_desintoxicante.PNG'],
    ['Shampoo ice', 25, 'shampoo_ice.PNG'],
    ['Shaving gel', 20, 'shaving_gel.PNG'],
  ].map(([name, price, image]) => ({ name, price, image }));

  let sortMode = 'name';

  function formatBRL(value) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function renderProducts() {
    const searchTerm = (searchInput?.value || '').trim().toLocaleLowerCase('pt-BR');
    const filteredProducts = products
      .filter((product) => product.name.toLocaleLowerCase('pt-BR').includes(searchTerm))
      .sort((first, second) => {
        if (sortMode === 'price') return first.price - second.price || first.name.localeCompare(second.name);
        return first.name.localeCompare(second.name);
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
      const card = document.createElement('article');
      card.className = 'product-list-card reveal is-visible';
      card.innerHTML = `
        <img src="${product.image ? `../images/produtos/${product.image}` : '../images/social.jpg'}" alt="${product.name}">
        <div class="product-list-card-copy">
          <h2>${product.name}</h2>
          <strong>${formatBRL(product.price)}</strong>
        </div>
      `;
      productGrid.appendChild(card);
    });
  }

  searchInput?.addEventListener('input', renderProducts);
  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      sortMode = button.dataset.productSort;
      sortButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      renderProducts();
    });
  });

  renderProducts();
});
