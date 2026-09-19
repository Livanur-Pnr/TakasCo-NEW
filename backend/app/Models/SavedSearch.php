<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SavedSearch extends Model
{
    protected $fillable = ['user_id', 'q', 'category_id', 'city', 'condition'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    // yeni yayınlanan ilan bu aramanın tüm dolu kriterlerini sağlıyor mu?
    public function matches(Product $product): bool
    {
        if ($this->category_id && (int) $this->category_id !== (int) $product->category_id) {
            return false;
        }
        if ($this->city && $this->city !== $product->city) {
            return false;
        }
        if ($this->condition && $this->condition !== $product->condition) {
            return false;
        }
        if ($this->q) {
            $haystack = $product->title . ' ' . $product->description . ' ' . $product->swap_expectation;
            if (mb_stripos($haystack, $this->q) === false) {
                return false;
            }
        }

        return true;
    }

    public function label(): string
    {
        return collect([$this->q, $this->category?->name, $this->city, $this->condition])->filter()->implode(' · ');
    }
}
