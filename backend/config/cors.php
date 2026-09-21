<?php

// API'ye hangi web adreslerinden tarayıcı isteği yapılabileceği. Kimlik doğrulama Bearer token ile olduğundan çerez gönderilmez.
// Yerelde varsayılan '*' (geliştirmede Expo farklı portlarda/LAN IP'lerinde çalışır); CANLIDA mutlaka sitenin adresine daralt:
//   CORS_ALLOWED_ORIGINS=https://takasco.com,https://www.takasco.com
return [
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '*'))))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 600,

    'supports_credentials' => false,
];
