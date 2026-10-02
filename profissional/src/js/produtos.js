document.addEventListener('DOMContentLoaded', () => {
  const storage = window.EliuzStorage;
  const token = sessionStorage.getItem('ADMIN_TOKEN') || '';
  const productForm = document.getElementById('product-form');
  const productFormHeading = document.getElementById('product-form-heading');
  const productId = document.getElementById('product-id');
  const productName = document.getElementById('product-name');
  const productShort = document.getElementById('product-short');
  const productDescription = document.getElementById('product-description');
  const productPrice = document.getElementById('product-price');
  const productImage = document.getElementById('product-image');
  const productCategory = document.getElementById('product-category');
  const productQuantity = document.getElementById('product-quantity');
  const productImagePreviewWrap = document.getElementById('product-image-preview-wrap');
  const productImagePreview = document.getElementById('product-image-preview');
  const productList = document.getElementById('product-list');
  const productCount = document.getElementById('product-count');
  const productFeedback = document.getElementById('product-feedback');
  let selectedImageData = '';

  function formatBRL(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function setFeedback(message, isError = false) {
    productFeedback.textContent = message;
    productFeedback.classList.toggle('is-error', isError);
  }

  function getPreviewSource(imageUrl) {
    if (String(imageUrl || '').startsWith('../images/produtos/')) {
      return `../../../cliente/src/images/produtos/${imageUrl.slice('../images/produtos/'.length)}`;
    }
    return imageUrl || '../../../cliente/src/images/social.jpg';
  }

  function showImagePreview(imageUrl) {
    productImagePreviewWrap.hidden = !imageUrl;
    if (imageUrl) productImagePreview.src = getPreviewSource(imageUrl);
    else productImagePreview.removeAttribute('src');
  }

  function clearForm() {
    productForm.reset();
    productId.value = '';
    selectedImageData = '';
    productFormHeading.textContent = 'Novo produto';
    showImagePreview('');
    setFeedback('');
  }

  async function renderProducts() {
    const products = (await storage.getProducts({ token })).filter((product) => product.ativo !== false);
    productList.innerHTML = '';
    productCount.textContent = `${products.length} ${products.length === 1 ? 'produto' : 'produtos'}`;

    if (!products.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Nenhum produto cadastrado.';
      productList.appendChild(empty);
      return;
    }

    products.forEach((product) => {
      const item = document.createElement('article');
      item.className = 'product-item product-admin-item';

      const image = document.createElement('img');
      image.className = 'product-admin-thumb';
      image.src = getPreviewSource(product.imageUrl);
      image.alt = product.name || 'Produto';
      image.loading = 'lazy';
      image.addEventListener('error', () => {
        image.src = '../../../cliente/src/images/social.jpg';
      }, { once: true });

      const details = document.createElement('div');
      details.className = 'product-admin-details';
      const title = document.createElement('strong');
      title.textContent = product.name || 'Produto';
      const description = document.createElement('p');
      description.textContent = product.shortDescription || product.category || 'Sem descrição';
      const quantity = product.quantity ?? (typeof product.stock === 'number' ? product.stock : null);
      const stock = document.createElement('small');
      stock.textContent = quantity === null ? product.stock || 'Estoque não informado' : `${quantity} unidades`;
      details.append(title, description, stock);

      const price = document.createElement('strong');
      price.className = 'product-admin-price';
      price.textContent = formatBRL(product.price ?? product.valor ?? 0);

      const actions = document.createElement('div');
      actions.className = 'product-admin-actions';
      const editButton = document.createElement('button');
      editButton.className = 'btn btn-secondary';
      editButton.type = 'button';
      editButton.textContent = 'Editar';
      editButton.addEventListener('click', () => {
        productId.value = product.id || '';
        productName.value = product.name || '';
        productShort.value = product.shortDescription || '';
        productDescription.value = product.description || '';
        productPrice.value = String(Number(product.price ?? product.valor ?? 0));
        productImage.value = '';
        selectedImageData = product.imageUrl || '';
        showImagePreview(selectedImageData);
        productCategory.value = product.category || '';
        productQuantity.value = String(quantity ?? '');
        productFormHeading.textContent = 'Editar produto';
        setFeedback('');
        productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        productName.focus({ preventScroll: true });
      });

      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-secondary';
      deleteButton.type = 'button';
      deleteButton.textContent = 'Excluir';
      deleteButton.addEventListener('click', async () => {
        if (!confirm(`Excluir ${product.name || 'este produto'} do catálogo?`)) return;
        try {
          await storage.deleteProduct(product.id, { token });
          await renderProducts();
          setFeedback('Produto excluído.');
        } catch (error) {
          setFeedback(error.message || 'Não foi possível excluir o produto.', true);
        }
      });

      actions.append(editButton, deleteButton);
      item.append(image, details, price, actions);
      productList.appendChild(item);
    });
  }

  productForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const hasQuantity = productQuantity.value !== '';
    if (!selectedImageData) {
      setFeedback('Selecione uma imagem para continuar.', true);
      productImage.focus();
      return;
    }
    if (!productName.value.trim() || !productShort.value.trim() || !productPrice.value || (!productId.value && !hasQuantity)) {
      setFeedback('Preencha nome, descrição curta, valor e quantidade para cadastrar um produto.', true);
      return;
    }

    const product = {
      id: productId.value || undefined,
      name: productName.value.trim(),
      shortDescription: productShort.value.trim(),
      description: productDescription.value.trim(),
      price: Number(productPrice.value || 0),
      imageUrl: selectedImageData,
      category: productCategory.value.trim(),
      featured: true,
    };
    if (hasQuantity) {
      product.quantity = Number(productQuantity.value);
      product.stock = Number(productQuantity.value);
    }

    try {
      await storage.saveProduct(product, { token });
      clearForm();
      await renderProducts();
      setFeedback('Produto salvo.');
    } catch (error) {
      setFeedback(error.message || 'Não foi possível salvar o produto.', true);
    }
  });

  productImage.addEventListener('change', async () => {
    const file = productImage.files?.[0];
    if (!file) return;
    const previousImage = selectedImageData;
    productImage.disabled = true;
    setFeedback('Preparando imagem...');
    try {
      selectedImageData = await window.EliuzImageUpload.compress(file);
      showImagePreview(selectedImageData);
      setFeedback('Imagem pronta para salvar.');
    } catch (error) {
      selectedImageData = previousImage;
      productImage.value = '';
      showImagePreview(previousImage);
      setFeedback(error.message || 'Não foi possível preparar a imagem.', true);
    } finally {
      productImage.disabled = false;
    }
  });

  document.getElementById('product-clear').addEventListener('click', clearForm);

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

  renderProducts().catch((error) => setFeedback(error.message || 'Não foi possível carregar os produtos.', true));
});