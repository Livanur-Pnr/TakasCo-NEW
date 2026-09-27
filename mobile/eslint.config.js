// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // SDK 57 ile gelen eslint-config-expo, React Compiler'a hazırlık amaçlı kurallar ekledi
    // (refs/immutability/set-state-in-effect/preserve-manual-memoization/purity). Bu proje
    // React Compiler kullanmıyor (babel.config.js'de eklenmedi) — bu kurallar gerçek hataları değil,
    // `useRef(new Animated.Value(0)).current`, effect içinde veri çekme/setState gibi tüm kod tabanında
    // yaygın ve güvenli, standart React Native kalıplarını işaretliyor. Derleyici benimsenirse yeniden açılmalı.
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
    },
  },
]);
