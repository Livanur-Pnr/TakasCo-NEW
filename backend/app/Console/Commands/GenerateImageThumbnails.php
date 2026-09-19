<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductImage;
use App\Services\ProductImageService;
use Illuminate\Console\Command;

class GenerateImageThumbnails extends Command
{
    protected $signature = 'images:thumbnails {--force : Var olan küçük görselleri de yeniden üret}';

    protected $description = 'Mevcut ürün görselleri için küçük (thumbnail) görselleri üretir';

    public function handle(): int
    {
        $made = 0;
        $skipped = 0;

        $paths = ProductImage::query()->pluck('image_path')
            ->merge(Product::withTrashed()->pluck('image_path')->flatMap(fn ($v) => ProductImageService::pathsFrom($v)))
            ->filter(fn ($p) => $p && !str_starts_with($p, 'http'))
            ->unique();

        foreach ($paths as $path) {
            $exists = ProductImageService::thumbOrOriginal($path) !== $path;
            if ($exists && !$this->option('force')) {
                $skipped++;
                continue;
            }
            ProductImageService::makeThumbnail($path) ? $made++ : $this->warn("Dosya yok: {$path}");
        }

        $this->info("Üretilen: {$made}, atlanan: {$skipped}");

        return self::SUCCESS;
    }
}
