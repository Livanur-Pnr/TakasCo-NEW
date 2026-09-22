// Learn more https://docs.expo.dev/router/reference/static-rendering/#root-html

import { ScrollViewStyleReset } from 'expo-router/html';

// Web'de kök HTML belgesini yapılandırır (yalnızca statik render sırasında Node.js'te çalışır, DOM/tarayıcı API'lerine erişemez).
//
// `color-scheme` ve sabit arka plan rengi: bazı tarayıcılar (ör. Microsoft Edge'in "web içeriği için otomatik koyu tema"
// ayarı), sayfa henüz stillenmeden önce boş/stilsiz HTML'i kendi koyu filtresiyle çizer; uygulamanın gerçek (açık) teması
// yüklenince sayfa aydınlanır ve bu kısa an bir "flash" gibi görünür. Chrome'da bu tarayıcı özelliği olmadığından aynı sayfa
// orada flash yapmaz. `color-scheme: light` bu tarayıcı filtresinin devreye girmesini engeller; sabit arka plan rengi de ilk
// boyamanın uygulamanın kendi zeminiyle aynı olmasını sağlar.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="light" />
        <style dangerouslySetInnerHTML={{ __html: 'html{color-scheme:light}html,body{background-color:#f7fcff}' }} />

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
