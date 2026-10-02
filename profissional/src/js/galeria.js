document.addEventListener('DOMContentLoaded', () => {
  const storage = window.EliuzStorage;
  const token = sessionStorage.getItem('ADMIN_TOKEN') || '';
  const galleryForm = document.getElementById('gallery-form');
  const galleryId = document.getElementById('gallery-id');
  const galleryTitle = document.getElementById('gallery-title');
  const galleryLabel = document.getElementById('gallery-label');
  const galleryAlt = document.getElementById('gallery-alt');
  const galleryImage = document.getElementById('gallery-image');
  const galleryImagePreviewWrap = document.getElementById('gallery-image-preview-wrap');
  const galleryImagePreview = document.getElementById('gallery-image-preview');
  const galleryFeatured = document.getElementById('gallery-featured');
  const galleryList = document.getElementById('gallery-admin-list');
  const galleryFeedback = document.getElementById('gallery-feedback');
  const formHeading = document.getElementById('gallery-form-heading');
  let selectedImageData = '';

  function setFeedback(message, isError = false) {
    galleryFeedback.textContent = message;
    galleryFeedback.classList.toggle('is-error', isError);
  }

  function getPreviewSource(imageUrl) {
    if (String(imageUrl || '').startsWith('../images/')) {
      return `../../../cliente/src/images/${imageUrl.slice('../images/'.length)}`;
    }
    return imageUrl || '../../../cliente/src/images/social.jpg';
  }

  function showImagePreview(imageUrl) {
    galleryImagePreviewWrap.hidden = !imageUrl;
    if (imageUrl) galleryImagePreview.src = getPreviewSource(imageUrl);
    else galleryImagePreview.removeAttribute('src');
  }

  function clearForm() {
    galleryForm.reset();
    galleryId.value = '';
    selectedImageData = '';
    formHeading.textContent = 'Adicionar imagem.';
    showImagePreview('');
    setFeedback('');
  }

  async function renderGallery() {
    const items = await storage.getGallery({ token });
    const activeItems = items.filter((item) => item.ativo !== false);
    galleryList.innerHTML = '';

    if (!activeItems.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Nenhuma imagem cadastrada.';
      galleryList.appendChild(empty);
      return;
    }

    activeItems.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'product-item gallery-admin-item';
      const preview = document.createElement('img');
      preview.className = 'gallery-admin-thumb';
      preview.src = getPreviewSource(item.imageUrl);
      preview.alt = item.altText || item.title || '';
      preview.loading = 'lazy';
      preview.addEventListener('error', () => {
        preview.src = '../../../cliente/src/images/social.jpg';
      }, { once: true });

      const details = document.createElement('div');
      details.className = 'gallery-admin-details';
      const title = document.createElement('strong');
      title.textContent = item.title || 'Imagem da galeria';
      const label = document.createElement('p');
      const category = String(item.label || '').toLocaleLowerCase('pt-BR') === 'em destaque' ? '' : item.label;
      label.textContent = [category || 'Sem categoria', item.featured ? 'Em destaque' : ''].filter(Boolean).join(' | ');
      details.append(title, label);

      const actions = document.createElement('div');
      actions.className = 'gallery-admin-actions';
      const editButton = document.createElement('button');
      editButton.className = 'btn btn-secondary';
      editButton.type = 'button';
      editButton.textContent = 'Editar';
      editButton.addEventListener('click', () => {
        galleryId.value = item.id || '';
        galleryTitle.value = item.title || '';
        galleryLabel.value = item.label || '';
        galleryAlt.value = item.altText || '';
        galleryImage.value = '';
        selectedImageData = item.imageUrl || '';
        showImagePreview(selectedImageData);
        galleryFeatured.checked = Boolean(item.featured);
        formHeading.textContent = 'Editar imagem.';
        galleryTitle.focus();
        setFeedback('');
      });

      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-secondary';
      deleteButton.type = 'button';
      deleteButton.textContent = 'Excluir';
      deleteButton.addEventListener('click', async () => {
        if (!confirm(`Excluir a imagem "${item.title || 'da galeria'}"?`)) return;
        try {
          await storage.deleteGalleryItem(item.id, { token });
          await renderGallery();
          setFeedback('Imagem excluída.');
        } catch (error) {
          setFeedback(error.message || 'Não foi possível excluir a imagem.');
        }
      });

      actions.append(editButton, deleteButton);
      row.append(preview, details, actions);
      galleryList.appendChild(row);
    });
  }

  galleryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedImageData) {
      setFeedback('Selecione uma imagem para continuar.', true);
      galleryImage.focus();
      return;
    }

    try {
      await storage.saveGalleryItem({
        id: galleryId.value || undefined,
        title: galleryTitle.value.trim(),
        label: galleryLabel.value.trim(),
        altText: galleryAlt.value.trim(),
        imageUrl: selectedImageData,
        featured: galleryFeatured.checked,
      }, { token });
      galleryForm.reset();
      galleryId.value = '';
      selectedImageData = '';
      formHeading.textContent = 'Adicionar imagem.';
      showImagePreview('');
      await renderGallery();
      setFeedback('Imagem salva.');
    } catch (error) {
      setFeedback(error.message || 'Não foi possível salvar a imagem.', true);
    }
  });

  galleryImage.addEventListener('change', async () => {
    const file = galleryImage.files?.[0];
    if (!file) return;
    const previousImage = selectedImageData;
    galleryImage.disabled = true;
    setFeedback('Preparando imagem...');
    try {
      selectedImageData = await window.EliuzImageUpload.compress(file);
      showImagePreview(selectedImageData);
      setFeedback('Imagem pronta para salvar.');
    } catch (error) {
      selectedImageData = previousImage;
      galleryImage.value = '';
      showImagePreview(previousImage);
      setFeedback(error.message || 'Não foi possível preparar a imagem.', true);
    } finally {
      galleryImage.disabled = false;
    }
  });

  document.getElementById('gallery-clear').addEventListener('click', () => {
    clearForm();
    galleryTitle.focus();
  });

  const adminControls = document.getElementById('admin-controls');
  if (adminControls && token) {
    const logout = document.createElement('button');
    logout.className = 'btn btn-secondary';
    logout.type = 'button';
    logout.textContent = 'Sair';
    logout.addEventListener('click', () => {
      sessionStorage.removeItem('ADMIN_TOKEN');
      location.href = '../login.html';
    });
    adminControls.appendChild(logout);
  }

  renderGallery().catch((error) => setFeedback(error.message || 'Não foi possível carregar a galeria.'));
});