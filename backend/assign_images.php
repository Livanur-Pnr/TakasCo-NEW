<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use Illuminate\Support\Facades\Storage;

$products = Product::all();
Storage::disk('public')->makeDirectory('products');

// Wikimedia Commons üzerinde aranacak, ürün başlığına karşılık gelen İngilizce arama terimi.
// (loremflickr.com'un anahtar kelimelere göre alakasız/tekrarlayan görseller döndürmesi
// nedeniyle Wikimedia Commons'a geçildi - gerçek, doğru etiketlenmiş fotoğraflar sunuyor.)
$keywordMap = [
    'iPhone 13' => 'iPhone 13 smartphone',
    'AirPods Pro' => 'Apple AirPods',
    'Logitech Mouse' => 'computer mouse',
    'Apple Watch 7' => 'Apple Watch smartwatch',
    'Powerbank 20k' => 'power bank battery charger',
    'Deri Ceket' => 'leather jacket',
    'Nike Air Force' => 'Nike sneakers shoes',
    'Güneş Gözlüğü' => 'sunglasses',
    'Sırt Çantası' => 'backpack',
    'Kaşe Palto' => 'wool overcoat',
    'Akustik Gitar' => 'acoustic guitar',
    'Mikrofon' => 'microphone',
    'Amfi' => 'guitar amplifier',
    'Ukulele' => 'ukulele',
    'Nota Sehpası' => 'music stand',
    'HP Kitap Seti' => 'Harry Potter books',
    'Kindle E-Okuyucu' => 'Amazon Kindle e-reader',
    'Klasik Romanlar' => 'classic novels books',
    'Çizim Seti' => 'pencil drawing set',
    'Satranç Takımı' => 'chess set board',
    'Dambıl Seti' => 'dumbbells weights',
    'Pilates Matı' => 'yoga mat',
    'Tenis Raketi' => 'tennis racket',
    'Basketbol Topu' => 'basketball',
    'Spor Çantası' => 'gym sports bag',
    'Kahve Makinesi' => 'coffee machine',
    'Lambader' => 'floor lamp',
    'Dekoratif Tablo' => 'wall art painting',
    'Nevresim Takımı' => 'bedding duvet set',
    'Vazo Seti' => 'ceramic vase',
    'PS5 Kolu' => 'PlayStation DualSense controller',
    'Gaming Kulaklık' => 'gaming headset',
    'Mekanik Klavye' => 'mechanical keyboard',
    'Oyun CD Seti' => 'video game disc case',
    'Yayıncı Işığı' => 'ring light streaming',
    'Şövale' => 'painting easel',
    'Akrilik Boya Seti' => 'acrylic paint set',
    'Eskiz Defteri' => 'sketchbook',
    'Fırça Seti' => 'paint brushes set',
    'Heykel Çamuru' => 'sculpting clay',
    'Kamp Çadırı' => 'camping tent',
    'Kamp Sandalyesi' => 'camping chair',
    'Termos 1L' => 'thermos flask',
    'Kafa Lambası' => 'head lamp headlamp',
    'Sırt Çantası 60L' => 'hiking backpack',
    'Eski Pullar' => 'postage stamps collection',
    'Pikap' => 'turntable record player',
    'Plak - Sezen Aksu' => 'vinyl record album',
    'Analog Kamera' => 'film camera analog',
    'Daktilo' => 'typewriter',
];

// Sonuç başlıklarında bu kelimeler geçiyorsa o görsel atlanır (haber/olay fotoğrafı, uygunsuz içerik vb.)
$blocklist = ['rifle', 'gun', 'weapon', 'shooting', 'crime', 'police', 'dead', 'death', 'murder', 'bomb', 'nude', 'nsfw', 'protest', 'war', 'funeral'];

function searchCommonsImage(string $query, array $blocklist): ?string
{
    $url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search'
        . '&gsrsearch=' . urlencode($query)
        . '&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime&iiurlwidth=800&format=json';

    $response = null;
    for ($attempt = 1; $attempt <= 4; $attempt++) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_USERAGENT, 'TakasCo-DemoDataScript/1.0');
        $response = curl_exec($ch);
        curl_close($ch);

        if ($response && !str_contains($response, 'too many requests')) {
            break;
        }
        echo "  (hiz siniri, {$attempt}. denemeden sonra bekleniyor...)\n";
        sleep(10 * $attempt);
        $response = null;
    }

    if (!$response) return null;
    $data = json_decode($response, true);
    $pages = $data['query']['pages'] ?? [];

    foreach ($pages as $page) {
        $title = strtolower($page['title'] ?? '');
        $info = $page['imageinfo'][0] ?? null;
        if (!$info) continue;

        $mime = $info['mime'] ?? '';
        if (!in_array($mime, ['image/jpeg', 'image/png'])) continue; // svg/diagramları atla

        $isBlocked = false;
        foreach ($blocklist as $word) {
            if (str_contains($title, $word)) { $isBlocked = true; break; }
        }
        if ($isBlocked) continue;

        return $info['thumburl'] ?? $info['url'] ?? null;
    }
    return null;
}

// bir onceki calismada zaten basariyla guncellenmis urunler tekrar sorgulanmaz
$alreadyDone = ['iPhone 13', 'AirPods Pro', 'Logitech Mouse', 'Apple Watch 7', 'Powerbank 20k', 'Deri Ceket', 'Nike Air Force', 'Güneş Gözlüğü', 'Sırt Çantası', 'Kaşe Palto', 'Akustik Gitar', 'Şövale', 'Akrilik Boya Seti'];

foreach ($products as $product) {
    if (in_array($product->title, $alreadyDone)) {
        echo "Skipping {$product->title} (already done)\n";
        continue;
    }
    echo "Processing {$product->title}...\n";
    $query = $keywordMap[$product->title] ?? $product->title;

    sleep(2); // Wikimedia hiz siniri icin istekler arasinda bekleme

    $imageUrl = searchCommonsImage($query, $blocklist);
    if (!$imageUrl) {
        echo "No suitable image found for {$product->title}\n";
        continue;
    }

    $ch = curl_init($imageUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_USERAGENT, 'TakasCo-DemoDataScript/1.0');
    $imageData = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($imageData && $httpCode == 200) {
        $ext = str_ends_with(strtolower($imageUrl), '.png') ? 'png' : 'jpg';
        $fileName = time() . '_' . uniqid() . '.' . $ext;
        Storage::disk('public')->put('products/' . $fileName, $imageData);

        $path = 'products/' . $fileName;
        $product->image_path = json_encode([$path]);
        $product->save();
        echo "Saved {$path} for {$product->title}\n";
    } else {
        echo "Failed to download image for {$product->title} (HTTP $httpCode)\n";
    }

}
echo "Done!\n";
