<?php

namespace App\Models;

use App\Enums\TradeStatus;
use Illuminate\Database\Eloquent\Model;

class Trade extends Model
{
    protected $fillable = [
        'sender_id',
        'receiver_id',
        'offered_product_id',
        'requested_product_id',
        'status',
        'cash_amount',
        'cash_direction',
        'parent_trade_id',
        'shipping_status',
        'shipping_carrier',
        'tracking_number',
        'shipped_at',
        'delivered_at',
    ];

    protected $casts = [
        'status' => TradeStatus::class,
        'cash_amount' => 'float',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];
// birincil ürüne ek olarak teklif edilen diğer ürünler (çoklu ürün teklifi)
    public function extraProducts()
    {
        return $this->belongsToMany(Product::class, 'trade_items')->select('products.id', 'products.title', 'products.image_path', 'products.status');
    }

    // teklifle birlikte takaslanacak tüm ürün id'leri (verilenler + istenen)
    public function allProductIds(): array
    {
        return array_values(array_unique(array_merge(
            [(int) $this->offered_product_id, (int) $this->requested_product_id],
            $this->extraProducts()->pluck('products.id')->map(fn ($i) => (int) $i)->all()
        )));
    }

//gönderen kim
    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }
//teklif giden ürün ne
    public function offeredProduct()
    {
        return $this->belongsTo(Product::class, 'offered_product_id');
    }
//takasta istenen ürün ne
    public function requestedProduct()
    {
        return $this->belongsTo(Product::class, 'requested_product_id');
    }
}
