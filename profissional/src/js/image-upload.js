window.EliuzImageUpload = (() => {
  const maxImageBytes = 450 * 1024;
  const maxSourceBytes = 15 * 1024 * 1024;

  async function decodeImage(file) {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('Não foi possível abrir essa imagem.'));
        image.src = objectUrl;
      });
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  }

  async function compress(file) {
    if (!file?.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
    if (file.size > maxSourceBytes) throw new Error('A imagem original deve ter até 15 MB.');

    const image = await decodeImage(file);
    const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
    let width = Math.round(image.width * scale);
    let height = Math.round(image.height * scale);
    let quality = 0.82;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      image.close();
      throw new Error('Não foi possível preparar essa imagem.');
    }

    try {
      for (let attempt = 0; attempt < 28 && Math.max(width, height) >= 160; attempt += 1) {
        canvas.width = width;
        canvas.height = height;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image.source, 0, 0, width, height);

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob) throw new Error('Não foi possível preparar essa imagem.');
        if (blob.size <= maxImageBytes) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Não foi possível ler essa imagem.'));
            reader.readAsDataURL(blob);
          });
        }

        if (quality > 0.52) quality -= 0.1;
        else {
          width = Math.round(width * 0.82);
          height = Math.round(height * 0.82);
          quality = 0.82;
        }
      }
    } finally {
      image.close();
    }

    throw new Error('Não foi possível reduzir a imagem o suficiente. Escolha uma foto menor.');
  }

  return { compress };
})();