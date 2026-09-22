<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    protected $fillable = ['user_id', 'name', 'email', 'subject', 'message', 'status', 'resolved_by', 'resolved_at'];

    protected $casts = ['resolved_at' => 'datetime'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
