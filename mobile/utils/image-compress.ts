const MAX_SIDE = 1600;
const QUALITY = 0.82;
const SKIP_BELOW_BYTES = 400 * 1024; // zaten küçük dosyalar olduğu gibi gider

// Web'de yükleme öncesi görseli tarayıcıda küçültür (en uzun kenar 1600 px, JPEG %82). Telefon fotoğrafları
// 5 MB sınırını aşabilir ve yavaş yüklenir; hata olursa ya da kazanç yoksa özgün dosya döner.
export async function compressImage(file: File): Promise<File> {
  try {
    if (typeof document === 'undefined' || !file.type.startsWith('image/') || file.type === 'image/gif') return file;
    if (file.size <= SKIP_BELOW_BYTES) return file;

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}
