// FormData gönderimi (fotoğraf yükleme) için ilerleme bildiren yardımcı. fetch yükleme ilerlemesi vermediğinden XMLHttpRequest kullanılır.
export function postFormWithProgress(
  url: string,
  form: FormData,
  token: string | null,
  onProgress?: (percent: number) => void,
  method: 'POST' | 'PUT' = 'POST',
): Promise<{ ok: boolean; status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = { message: 'Sunucudan geçersiz yanıt alındı.' };
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error('Ağ hatası: bağlantını kontrol et.'));
    xhr.ontimeout = () => reject(new Error('İstek zaman aşımına uğradı.'));
    xhr.send(form as any);
  });
}
