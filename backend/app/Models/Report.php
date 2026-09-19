<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    public const REASONS = ['spam', 'yaniltici', 'uygunsuz', 'sahte', 'diger'];
    public const TYPES = ['product', 'user'];

    protected $fillable = ['reporter_id', 'target_type', 'target_id', 'reason', 'details', 'status', 'resolved_by', 'resolved_at'];

    protected $casts = ['resolved_at' => 'datetime'];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }
}
