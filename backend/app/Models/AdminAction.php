<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminAction extends Model
{
    protected $fillable = ['admin_id', 'action', 'target_type', 'target_id', 'details'];

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    // İşlemi kaydeder; kayıt hatası asıl yönetici işlemini asla bozmaz
    public static function record(?User $admin, string $action, ?string $type = null, ?int $id = null, ?string $details = null): void
    {
        try {
            static::create([
                'admin_id' => $admin?->id, 'action' => $action, 'target_type' => $type, 'target_id' => $id,
                'details' => $details !== null ? mb_substr($details, 0, 250) : null,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
