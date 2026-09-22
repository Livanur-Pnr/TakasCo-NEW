<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

// İletişim formu: hem misafir hem üye gönderebilir (üyeyse token'dan user_id otomatik eklenir).
// Kimlik doğrulama zorunlu değildir; spam'e karşı yalnızca hız sınırı (route'ta throttle) uygulanır.
class ContactMessageController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|string|email|max:255',
            'subject' => 'required|string|max:150',
            'message' => 'required|string|max:2000',
        ]);

        ContactMessage::create($data + ['user_id' => auth('sanctum')->id()]);

        return response()->json(['message' => 'Mesajın bize ulaştı. En kısa sürede dönüş yapacağız.'], 201);
    }
}
