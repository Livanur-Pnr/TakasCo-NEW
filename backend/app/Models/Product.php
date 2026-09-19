<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\ProductImage;


class Product extends Model
{
    use  SoftDeletes;//dbden silinmez silindi olarak işaretlenir

    protected $dates = ['deleted_at'];
    protected $with = ['images'];
    protected $appends = ['image_path', 'thumb_path'];

    // bir ürünün birden fazla resmi olabilir
    // herkese açık ilanlar: yayında (1,2) ve sahibi askıda değil
    public function scopePublished($query)
    {
        return $query->whereIn('status', [1, 2])->whereHas('user', fn ($u) => $u->whereNull('suspended_at'));
    }

    public function images()
    {
        //biribine bağladık 
        return $this->hasMany(ProductImage::class, 'product_id');
    }
    //izin verilen güvenli sütun listesi
    protected $fillable = [
        'user_id',
        'category_id',
        'title',
        'description',
        'condition',
        'swap_expectation',
        'status',
        'city',
        'district',
        'image_path',
        'target_trade',
        'price',
        'listing_type',
        'brand',
        'shipping_enabled',
        'meetup_enabled',
    ];

    public const TYPES = ['satilik', 'takas', 'ikisi'];

    protected $casts = [
        'price' => 'float',
        'shipping_enabled' => 'boolean',
        'meetup_enabled' => 'boolean',
    ];

    public function acceptsSwap(): bool
    {
        return $this->listing_type !== 'satilik';
    }

    public function getImagePathAttribute()
    {
        // First, check the new 'images' relation
        if ($this->relationLoaded('images') && $this->images->count() > 0) {
            $primaryImage = $this->images->where('is_primary', true)->first() ?? $this->images->first();
            return $primaryImage->image_path;
        }

        // Fallback to old database column. Read straight from the raw attributes:
        // because 'image_path' is both a real column AND listed in $appends,
        // Laravel's array/JSON serialization calls this accessor with $value = null,
        // so we can't rely on the method argument here.
        $value = $this->attributes['image_path'] ?? null;
        if ($value) {
            // Because it might be a JSON string like '["products/foo.jpg"]'
            // We just return it as is, frontend already handles the startsWith('[') check.
            if (is_array($value)) {
                 return json_encode($value);
            }
            return $value;
        }
        return null;
    }

    // liste/kartlarda kullanılacak küçük kapak görseli (yoksa orijinal kapak)
    public function getThumbPathAttribute()
    {
        return \App\Services\ProductImageService::thumbOrOriginal($this->image_path);
    }

    //// her ilan/ürün sadece bir kullanıcıya aittir
      public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    // Dolap tarzı "X kişi favoriledi" gösterimi için
    public function favoritedBy()
    {
        return $this->hasMany(Favorite::class);
    }

}
