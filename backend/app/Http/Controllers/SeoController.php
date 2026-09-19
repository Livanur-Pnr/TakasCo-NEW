<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Response;

// Arama motorları için robots.txt ve sitemap.xml. Adresler ön yüz (web) alan adına göre üretilir (FRONTEND_URL).
class SeoController extends Controller
{
    private const STATIC_PATHS = ['/', '/search', '/hakkimizda', '/nasil-calisir', '/guvenli-takas', '/sss', '/topluluk-kurallari', '/kvkk', '/iletisim', '/terms', '/privacy-policy'];

    private function base(): string
    {
        return rtrim((string) config('app.frontend_url'), '/');
    }

    public function robots(): Response
    {
        $lines = [
            'User-agent: *',
            'Allow: /',
            'Disallow: /admin',
            'Disallow: /messages',
            'Disallow: /notifications',
            'Disallow: /profile',
            'Disallow: /offers',
            'Disallow: /my-trades',
            'Disallow: /my-listings',
            'Disallow: /saved-searches',
            'Disallow: /settings',
            'Sitemap: ' . $this->base() . '/sitemap.xml',
        ];

        return response(implode("\n", $lines) . "\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function sitemap(): Response
    {
        $base = $this->base();
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach (self::STATIC_PATHS as $path) {
            $xml .= '  <url><loc>' . e($base . $path) . '</loc></url>' . "\n";
        }

        // yalnızca herkese açık ilanlar (askıdaki hesapların ve kaldırılmış ilanların adresi sızmaz)
        Product::published()->orderByDesc('id')->limit(5000)->get(['id', 'updated_at'])->each(function (Product $p) use (&$xml, $base) {
            $xml .= '  <url><loc>' . e($base . '/product/' . $p->id) . '</loc><lastmod>' . $p->updated_at->toAtomString() . '</lastmod></url>' . "\n";
        });

        return response($xml . '</urlset>' . "\n", 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
