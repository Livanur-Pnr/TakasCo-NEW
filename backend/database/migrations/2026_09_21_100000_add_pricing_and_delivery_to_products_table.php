<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Mevcut ilanlar takas ilanıdır: listing_type varsayılanı 'takas', fiyat boştur.
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('price', 12, 2)->nullable();
            $table->string('listing_type', 10)->default('takas'); // satilik | takas | ikisi
            $table->string('brand')->nullable();
            $table->boolean('shipping_enabled')->default(false);
            $table->boolean('meetup_enabled')->default(true);
            $table->index('listing_type');
            $table->index('price');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['listing_type']);
            $table->dropIndex(['price']);
            $table->dropColumn(['price', 'listing_type', 'brand', 'shipping_enabled', 'meetup_enabled']);
        });
    }
};
