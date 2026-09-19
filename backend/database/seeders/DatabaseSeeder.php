<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
public function run(): void
{
    // kategoriler
    $categories = ['Elektronik', 'Moda', 'Kitap & Hobi', 'Ev & Yaşam', 'Spor'];
    foreach ($categories as $name) {
        Category::firstOrCreate(['name' => $name]);
    }

    $ids = [
        'el' => Category::where('name', 'Elektronik')->first()->id,
        'mo' => Category::where('name', 'Moda')->first()->id,
        'ki' => Category::where('name', 'Kitap & Hobi')->first()->id,
        'ev' => Category::where('name', 'Ev & Yaşam')->first()->id,
        'sp' => Category::where('name', 'Spor')->first()->id,
    ];

    // kullanıcılar
    $userData = [
        ['name' => 'Ahmet Teknoloji', 'email' => 'ahmet@example.com'],
        ['name' => 'Merve Moda', 'email' => 'merve@example.com'],
        ['name' => 'Mert Müzisyen', 'email' => 'mert@example.com'],
        ['name' => 'Selin Kitapçı', 'email' => 'selin@example.com'],
        ['name' => 'Berk Sporcu', 'email' => 'berk@example.com'],
        ['name' => 'Zeynep Evim', 'email' => 'zeynep@example.com'],
        ['name' => 'Burak Gamer', 'email' => 'burak@example.com'],
        ['name' => 'Elif Sanatçı', 'email' => 'elif@example.com'],
        ['name' => 'Can Outdoor', 'email' => 'can@example.com'],
        ['name' => 'Deniz Koleksiyon', 'email' => 'deniz@example.com'],
    ];

    // kullanıcıların ürünleri
    $productPool = [
        'ahmet@example.com' => [
            ['t' => 'iPhone 13', 'c' => $ids['el'], 'd' => 'Pil %88, kutulu.', 's' => 'Macbook'],
            ['t' => 'AirPods Pro', 'c' => $ids['el'], 'd' => '2. nesil, tertemiz.', 's' => 'Samsung Buds'],
            ['t' => 'Logitech Mouse', 'c' => $ids['el'], 'd' => 'G502 kablolu model.', 's' => 'Klavye'],
            ['t' => 'Apple Watch 7', 'c' => $ids['el'], 'd' => 'Siyah renk, 45mm.', 's' => 'Akıllı Saat'],
            ['t' => 'Powerbank 20k', 'c' => $ids['el'], 'd' => 'Hızlı şarj destekli.', 's' => 'Bluetooth Hoparlör'],
        ],
        'merve@example.com' => [
            ['t' => 'Deri Ceket', 'c' => $ids['mo'], 'd' => 'S beden, hakiki deri.', 's' => 'Trençkot'],
            ['t' => 'Nike Air Force', 'c' => $ids['mo'], 'd' => '38 numara, beyaz.', 's' => 'Adidas Forum'],
            ['t' => 'Güneş Gözlüğü', 'c' => $ids['mo'], 'd' => 'Ray-Ban klasik model.', 's' => 'Marka Saat'],
            ['t' => 'Sırt Çantası', 'c' => $ids['mo'], 'd' => 'Kanken orjinal mavi.', 's' => 'Omuz Çantası'],
            ['t' => 'Kaşe Palto', 'c' => $ids['mo'], 'd' => 'Yün karışımlı, gri.', 's' => 'Mont'],
        ],
        'mert@example.com' => [
            ['t' => 'Akustik Gitar', 'c' => $ids['ki'], 'd' => 'Fender CD-60.', 's' => 'Elektro Gitar'],
            ['t' => 'Mikrofon', 'c' => $ids['el'], 'd' => 'Rode NT-1A set.', 's' => 'Ses Kartı'],
            ['t' => 'Amfi', 'c' => $ids['el'], 'd' => 'Marshall 15W.', 's' => 'Pedal'],
            ['t' => 'Ukulele', 'c' => $ids['ki'], 'd' => 'Konser tipi, kılıflı.', 's' => 'Müzik Aleti'],
            ['t' => 'Nota Sehpası', 'c' => $ids['ki'], 'd' => 'Katlanabilir metal.', 's' => 'Metronom'],
        ],
        'selin@example.com' => [
            ['t' => 'HP Kitap Seti', 'c' => $ids['ki'], 'd' => '7 kitap tam set.', 's' => 'LOTR Seti'],
            ['t' => 'Kindle E-Okuyucu', 'c' => $ids['el'], 'd' => 'Paperwhite 4.', 's' => 'Tablet'],
            ['t' => 'Klasik Romanlar', 'c' => $ids['ki'], 'd' => '10 adet dünya klasiği.', 's' => 'Modern Klasikler'],
            ['t' => 'Çizim Seti', 'c' => $ids['ki'], 'd' => 'Karakalem profesyonel.', 's' => 'Boya Seti'],
            ['t' => 'Satranç Takımı', 'c' => $ids['ki'], 'd' => 'Ahşap, el yapımı.', 's' => 'Masa Oyunu'],
        ],
        'berk@example.com' => [
            ['t' => 'Dambıl Seti', 'c' => $ids['sp'], 'd' => '2x10kg ayarlanabilir.', 's' => 'Barfiks Çubuğu'],
            ['t' => 'Pilates Matı', 'c' => $ids['sp'], 'd' => '10mm kalınlık, kaymaz.', 's' => 'Yoga Bloğu'],
            ['t' => 'Tenis Raketi', 'c' => $ids['sp'], 'd' => 'Wilson marka, az kullanıldı.', 's' => 'Squash Raketi'],
            ['t' => 'Basketbol Topu', 'c' => $ids['sp'], 'd' => 'Spalding TF-150.', 's' => 'Voleybol Topu'],
            ['t' => 'Spor Çantası', 'c' => $ids['sp'], 'd' => '50 litre, ayakkabı bölmeli.', 's' => 'Sırt Çantası'],
        ],
        'zeynep@example.com' => [
            ['t' => 'Kahve Makinesi', 'c' => $ids['ev'], 'd' => 'Filtre kahve, zaman ayarlı.', 's' => 'Espresso Makinesi'],
            ['t' => 'Lambader', 'c' => $ids['ev'], 'd' => 'Modern tasarım, ahşap ayak.', 's' => 'Abajur'],
            ['t' => 'Dekoratif Tablo', 'c' => $ids['ev'], 'd' => 'Yağlı boya reprodüksiyon.', 's' => 'Ayna'],
            ['t' => 'Nevresim Takımı', 'c' => $ids['mo'], 'd' => 'Çift kişilik, pamuk saten.', 's' => 'Battaniye'],
            ['t' => 'Vazo Seti', 'c' => $ids['ev'], 'd' => 'Seramik, 3 parça.', 's' => 'Saksı'],
        ],
        'burak@example.com' => [
            ['t' => 'PS5 Kolu', 'c' => $ids['el'], 'd' => 'DualSense beyaz.', 's' => 'Xbox Kolu'],
            ['t' => 'Gaming Kulaklık', 'c' => $ids['el'], 'd' => '7.1 Surround ses.', 's' => 'Gaming Mouse'],
            ['t' => 'Mekanik Klavye', 'c' => $ids['el'], 'd' => 'RGB aydınlatmalı, Blue switch.', 's' => 'Mousepad'],
            ['t' => 'Oyun CD Seti', 'c' => $ids['el'], 'd' => '3 adet popüler oyun.', 's' => 'Dijital Kod'],
            ['t' => 'Yayıncı Işığı', 'c' => $ids['el'], 'd' => 'Ring light ve tripod.', 's' => 'Webcam'],
        ],
        'elif@example.com' => [
            ['t' => 'Şövale', 'c' => $ids['ki'], 'd' => 'Büyük boy, gürgen ağacı.', 's' => 'Tuval Seti'],
            ['t' => 'Akrilik Boya Seti', 'c' => $ids['ki'], 'd' => '24 renk profesyonel.', 's' => 'Yağlı Boya'],
            ['t' => 'Eskiz Defteri', 'c' => $ids['ki'], 'd' => 'A3 boyut, 200 gr kağıt.', 's' => 'Marker Kalem'],
            ['t' => 'Fırça Seti', 'c' => $ids['ki'], 'd' => 'Sentetik ve doğal kıllar.', 's' => 'Palet'],
            ['t' => 'Heykel Çamuru', 'c' => $ids['ki'], 'd' => '5 kg, fırın gerektirmez.', 's' => 'Seramik Seti'],
        ],
        'can@example.com' => [
            ['t' => 'Kamp Çadırı', 'c' => $ids['sp'], 'd' => '3 kişilik, su geçirmez.', 's' => 'Uyku Tulumu'],
            ['t' => 'Kamp Sandalyesi', 'c' => $ids['sp'], 'd' => 'Katlanabilir, bardaklıklı.', 's' => 'Kamp Masası'],
            ['t' => 'Termos 1L', 'c' => $ids['ev'], 'd' => '24 saat sıcak/soğuk tutar.', 's' => 'Yemek Termosu'],
            ['t' => 'Kafa Lambası', 'c' => $ids['el'], 'd' => 'Şarj edilebilir, yüksek lümen.', 's' => 'El Feneri'],
            ['t' => 'Sırt Çantası 60L', 'c' => $ids['sp'], 'd' => 'Dağcılık tipi, yağmurluklu.', 's' => 'Kamp Ocağı'],
        ],
        'deniz@example.com' => [
            ['t' => 'Eski Pullar', 'c' => $ids['ki'], 'd' => "1950'ler Avrupa koleksiyonu.", 's' => 'Eski Paralar'],
            ['t' => 'Pikap', 'c' => $ids['el'], 'd' => 'Bluetooth özellikli retro.', 's' => 'Hoparlör'],
            ['t' => 'Plak - Sezen Aksu', 'c' => $ids['ki'], 'd' => 'Gülümse albümü, sıfır.', 's' => 'Farklı Plak'],
            ['t' => 'Analog Kamera', 'c' => $ids['el'], 'd' => 'Zenit marka, çalışır durumda.', 's' => 'Dijital Kamera'],
            ['t' => 'Daktilo', 'c' => $ids['ki'], 'd' => 'Erika marka, şeridi yeni.', 's' => 'Antika Obje'],
        ],
    ];
    //konum random
    $locations = [
        ['city' => 'İstanbul', 'district' => 'Kadıköy'],
        ['city' => 'İstanbul', 'district' => 'Beşiktaş'],
        ['city' => 'Ankara', 'district' => 'Çankaya'],
        ['city' => 'Ankara', 'district' => 'Yenimahalle'],
        ['city' => 'İzmir', 'district' => 'Karşıyaka'],
        ['city' => 'İzmir', 'district' => 'Bornova'],
        ['city' => 'Bursa', 'district' => 'Nilüfer'],
        ['city' => 'Antalya', 'district' => 'Muratpaşa'],
        ['city' => 'Adana', 'district' => 'Çukurova'],
        ['city' => 'Muğla', 'district' => 'Bodrum'],
    ];

    // kullanıcı şablonlarını tek tek döndürme
    foreach ($userData as $u) {
        $location = $locations[array_rand($locations)];
        //kullanıcı yoksa oluştur
        $user = User::firstOrCreate(['email' => $u['email']], [
            'name' => $u['name'],
            'phone_number' => '555' . rand(100, 999) . rand(10, 99) . rand(10, 99),
            'password' => Hash::make('qwer1234'), //sabit şifre
            'address_title' => 'Ev',
            'city' => $location['city'],
            'district' => $location['district'],
        ]);
        // oluşturulan kullanıcının e-posta adresine karşılık gelen ürün havuzunu dön
        foreach ($productPool[$u['email']] as $p) {
            Product::create([
                'user_id' => $user->id,
                'category_id' => $p['c'],
                'title' => $p['t'],//ilan basligi
                'description' => $p['d'],
                'condition' => ['Sıfır', 'Az Kullanılmış', 'Eskimiş'][array_rand(['Sıfır', 'Az Kullanılmış', 'Eskimiş'])],
                'swap_expectation' => $p['s'],
                'image_path' => "https://picsum.photos/seed/" . str_replace(' ', '', $p['t']) . "/800/800",//görsel linki üret
                'status' => 1,
                'target_trade' => $p['s'],// hedeflenen takas ürünü
                'city' => $location['city'],
                'district' => $location['district'],
            ]);
        }
    }
}
}