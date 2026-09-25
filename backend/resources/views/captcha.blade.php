<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="robots" content="noindex">
<title>Doğrulama · TakasCo</title>
<style>
  :root { --bg:#f7fcff; --card:#ffffff; --text:#111827; --muted:#6b7280; --border:#e5e7eb; --accent:#1B7A43; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0d1310; --card:#101715; --text:#f1f5f2; --muted:#9ca3af; --border:#1f2a24; --accent:#6ee7b7; } }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  main { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { width: 100%; max-width: 380px; background: var(--card); border: 1px solid var(--border); border-radius: 20px;
    padding: 28px 22px; display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 22px; color: var(--accent); letter-spacing: -0.3px; }
  h1 { margin: 0; font-size: 19px; }
  p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; }
  .done { display: none; color: var(--accent); font-weight: 700; }
  a.cancel { color: var(--muted); font-size: 14px; text-decoration: none; padding: 8px 12px; }
</style>
<script>
  const REDIRECT = @json($redirect);
  function back(params) {
    const sep = REDIRECT.includes('?') ? '&' : '?';
    window.location.replace(REDIRECT + sep + new URLSearchParams(params).toString());
  }
  function onVerified(token) {
    document.getElementById('done').style.display = 'block';
    back({ token });
  }
  function onLoad() {
    const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    grecaptcha.render('captcha', { sitekey: @json($siteKey), theme: dark ? 'dark' : 'light', callback: onVerified });
  }
</script>
<script src="https://www.google.com/recaptcha/api.js?hl=tr&onload=onLoad&render=explicit" async defer></script>
</head>
<body>
<main>
  <div class="card">
    <div class="brand">
      <svg width="30" height="30" viewBox="0 0 512 512" aria-hidden="true">
        <g transform="rotate(-74 256 256)"><circle cx="256" cy="256" r="159" fill="none" stroke="#1B7A43" stroke-width="60" stroke-linecap="round" stroke-dasharray="382.96 616.07"/></g>
        <g transform="rotate(106 256 256)"><circle cx="256" cy="256" r="159" fill="none" stroke="#5FD9A4" stroke-width="60" stroke-linecap="round" stroke-dasharray="382.96 616.07"/></g>
        <polygon points="311.43,408.86 342.39,337.63 389.01,412.26" fill="#1B7A43"/>
        <polygon points="200.57,103.14 169.61,174.37 122.99,99.74" fill="#5FD9A4"/>
        <circle cx="256" cy="256" r="24" fill="#141E28"/><circle cx="256" cy="256" r="8.5" fill="#fff"/>
      </svg>
      TakasCo
    </div>
    <h1>Robot olmadığını doğrula</h1>
    <p>Giriş yapmadan önce aşağıdaki kutuyu işaretle. İşaretleyince uygulamaya otomatik olarak döneceksin.</p>
    <div id="captcha"></div>
    <p id="done" class="done">Doğrulandı, uygulamaya dönülüyor…</p>
    <a class="cancel" href="#" onclick="back({ cancelled: '1' }); return false;">Vazgeç</a>
  </div>
</main>
</body>
</html>
