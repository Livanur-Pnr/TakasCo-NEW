<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

// Ürün görselleri: 800px ana görsel (JPEG) + liste/kartlar için 400px küçük görsel (WebP).
// Dosya adı ve uzantı istemciden değil sunucudan üretilir; görsel yeniden kodlandığı için içerik de temizlenir.
class ProductImageService
{
    public const MAIN_SIZE = 800;
    public const THUMB_SIZE = 400;

    private static function absolute(string $relative): string
    {
        return storage_path('app/public/' . $relative);
    }

    public static function thumbPathFor(string $relativePath): string
    {
        $name = pathinfo($relativePath, PATHINFO_FILENAME);

        return 'products/thumbs/' . $name . '.webp';
    }

    // yüklenen dosyayı işler, kaydeder ve ana görselin göreli yolunu döndürür
    public static function store(UploadedFile $file): string
    {
        $relative = 'products/' . time() . '_' . uniqid() . '.jpg';
        self::ensureDirectories();

        $manager = new ImageManager(new Driver());
        $manager->decode($file->getRealPath())->cover(self::MAIN_SIZE, self::MAIN_SIZE)->save(self::absolute($relative), quality: 82);
        self::makeThumbnail($relative);

        return $relative;
    }

    // var olan ana görselden küçük görsel üretir (yeni yüklemeler ve geri-doldurma için)
    public static function makeThumbnail(string $relative): bool
    {
        $source = self::absolute($relative);
        if (!is_file($source)) {
            return false;
        }

        self::ensureDirectories();
        $manager = new ImageManager(new Driver());
        $manager->decode($source)->cover(self::THUMB_SIZE, self::THUMB_SIZE)->save(self::absolute(self::thumbPathFor($relative)), quality: 80);

        return true;
    }

    public static function delete(string $relative): void
    {
        foreach ([$relative, self::thumbPathFor($relative)] as $path) {
            if (is_file(self::absolute($path))) {
                @unlink(self::absolute($path));
            }
        }
    }

    // küçük görsel varsa onun yolunu, yoksa (eski kayıtlar) orijinal yolu verir
    public static function thumbOrOriginal(?string $relative): ?string
    {
        // eski kayıtlarda image_path JSON dizi olabilir (["products/a.jpg"]): ilk görseli kullan
        if ($relative && str_starts_with($relative, '[')) {
            $relative = json_decode($relative, true)[0] ?? null;
        }

        if (!$relative || str_starts_with($relative, 'http')) {
            return $relative;
        }

        $thumb = self::thumbPathFor($relative);

        return is_file(self::absolute($thumb)) ? $thumb : $relative;
    }

    // DB'de tutulan değeri (tek yol ya da eski JSON dizi) yol listesine çevirir
    public static function pathsFrom(?string $stored): array
    {
        if (!$stored) {
            return [];
        }
        if (str_starts_with($stored, '[')) {
            return array_values(array_filter(json_decode($stored, true) ?? []));
        }

        return [$stored];
    }

    private static function ensureDirectories(): void
    {
        $dir = self::absolute('products/thumbs');
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
}
