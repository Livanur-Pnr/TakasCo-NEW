<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductImage extends Model
{
    protected $appends = ['thumb_path'];

    // liste/kartlarda kullanılacak küçük görsel yolu (yoksa orijinal)
    public function getThumbPathAttribute(): ?string
    {
        return \App\Services\ProductImageService::thumbOrOriginal($this->image_path);
    }

    protected $table = 'product_images';
    protected $fillable =
     [
    'product_id',
    'image_path',
    'is_primary', // Bu resim ilanın vitrin/kapak resmi mi? (True/False veya 1/0)
    'sort_order'// Resimlerin galeri içerisindeki gösterim sırası (0, 1, 2 vb.)
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}

