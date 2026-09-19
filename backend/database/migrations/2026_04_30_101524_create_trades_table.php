<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    
    public function up(): void
    {
        Schema::create('trades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users'); // Teklifi yapan
            $table->foreignId('receiver_id')->constrained('users'); // İlanın sahibi
            $table->foreignId('offered_product_id')->constrained('products'); // Verilen ürün
            $table->foreignId('requested_product_id')->constrained('products'); // İstenen ürün
            $table->string('status')->default('beklemede'); // beklemede, onaylandı, reddedildi
            $table->timestamps();
        });
    }

    
    public function down(): void
    {
        Schema::dropIfExists('trades');
    }
};
