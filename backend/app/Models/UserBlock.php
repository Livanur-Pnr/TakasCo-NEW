<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserBlock extends Model
{
    protected $fillable = ['blocker_id', 'blocked_id'];

    // iki kullanıcıdan biri diğerini engellemişse true (yön fark etmez)
    public function blocked()
    {
        return $this->belongsTo(User::class, 'blocked_id');
    }

    public static function existsBetween(int $a, int $b): bool
    {
        return static::where(fn ($q) => $q->where('blocker_id', $a)->where('blocked_id', $b))
            ->orWhere(fn ($q) => $q->where('blocker_id', $b)->where('blocked_id', $a))
            ->exists();
    }
}
