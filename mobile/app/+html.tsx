// Learn more https://docs.expo.dev/router/reference/static-rendering/#root-html

import { ScrollViewStyleReset } from 'expo-router/html';

// Web'de kök HTML belgesini yapılandırır (yalnızca statik render sırasında Node.js'te çalışır, DOM/tarayıcı API'lerine erişemez).
//
// Açılışta flash önleme: sayfa henüz React yüklenip hidrasyon tamamlanmadan önce ham HTML çizilir. `color-scheme: light dark`
// tarayıcıya sitenin her iki temayı da desteklediğini söyler (Edge'in "web içeriği için otomatik koyu tema" filtresi devreye
// girmez). Aşağıdaki engelleyici (blocking) betik, kullanıcının kaydettiği tema tercihini (`localStorage['theme_preference']`,
// bkz. hooks/use-app-theme.tsx) ya da yoksa sistem tercihini React yüklenmeden önce okuyup `<html>` arka planını buna göre
// ayarlar; böylece koyu temalı bir kullanıcı açık zeminin bir anlığına görünüp kararmasını (ya da tersini) görmez.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: 'html{background-color:#f7fcff}' }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem('theme_preference');var d=v==='dark'||(v!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.style.backgroundColor='#0d1310';document.documentElement.style.colorScheme='dark';}}catch(e){}})();`,
          }}
        />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}
