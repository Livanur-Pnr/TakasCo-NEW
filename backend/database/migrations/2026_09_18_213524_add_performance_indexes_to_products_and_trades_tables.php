<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Sadece ek index'ler; hiçbir kolon/veri değişmiyor, tamamen additive ve geri alınabilir.
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->index(['status', 'category_id']); // GET /products filtreleri (status + kategori)
            $table->index('city');                     // şehir filtresi
        });

        Schema::table('trades', function (Blueprint $table) {
            $table->index('status'); // beklemede teklifleri sorgulayan update/where'ler için
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['status', 'category_id']);
            $table->dropIndex(['city']);
        });

        Schema::table('trades', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });
    }
};
