document.addEventListener('DOMContentLoaded', () => {
  const storage = window.EliuzStorage;
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryCount = document.getElementById('gallery-count');
  const galleryCountNumber = document.getElementById('gallery-count-number');

  function renderGallery(items) {
    const activeItems = items.filter((item) => item.ativo !== false);
    galleryGrid.innerHTML = '';
    galleryCountNumber.textContent = String(activeItems.length).padStart(2, '0');
    galleryCount.setAttribute('aria-label', `${activeItems.length} referências`);

    if (!activeItems.length) {
      const empty = document.createElement('p');
      empty.className = 'product-list-empty';
      empty.textContent = 'Nenhuma imagem na galeria no momento.';
      galleryGrid.appendChild(empty);
      return;
    }

    activeItems.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'portfolio-card gallery-card reveal is-visible';
      if (item.featured) card.classList.add('gallery-card-featured');

      const image = document.createElement('img');
      image.src = item.imageUrl || '../images/social.jpg';
      image.alt = item.altText || item.title || 'Imagem da galeria';
      image.loading = 'lazy';
      image.addEventListener('error', () => {
        image.src = '../images/social.jpg';
      }, { once: true });

      const caption = document.createElement('div');
      caption.className = 'gallery-card-caption';
      const indexLabel = document.createElement('div');
      indexLabel.className = 'gallery-card-index';
      indexLabel.append(document.createTextNode(String(index + 1).padStart(2, '0')));
      const category = document.createElement('small');
      category.textContent = item.featured ? 'EM DESTAQUE' : String(item.label || 'GALERIA').toLocaleUpperCase('pt-BR');
      indexLabel.appendChild(category);

      const title = document.createElement('h2');
      title.textContent = item.title || 'Galeria';
      caption.append(indexLabel, title);
      card.append(image, caption);
      galleryGrid.appendChild(card);
    });
  }

  async function loadGallery() {
    galleryGrid.textContent = 'Carregando galeria...';
    try {
      if (!storage?.getGallery) throw new Error('Galeria indisponível.');
      renderGallery(await storage.getGallery());
    } catch (error) {
      galleryGrid.textContent = 'Não foi possível carregar a galeria. Tente novamente mais tarde.';
    }
  }

  loadGallery();
});