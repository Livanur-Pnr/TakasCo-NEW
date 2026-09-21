<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Yeni ilanlar 60 gün yayında kalır; mevcut ilanlar (expires_at boş) süresiz kalmaya devam eder.
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable();
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['expires_at']);
            $table->dropColumn('expires_at');
        });
    }
};
