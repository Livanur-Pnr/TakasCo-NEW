<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Onaylanmış takaslarda kargo takibi (ödeme yok; yalnızca durum + kargo firması/takip no).
        // İlan sahibi (receiver, satılan/istenen ürünü gönderen taraf) durumu günceller; diğer taraf salt okunur görür.
        Schema::table('trades', function (Blueprint $table) {
            $table->string('shipping_status')->nullable()->after('cash_direction'); // null | hazırlanıyor | kargoda | teslim edildi
            $table->string('shipping_carrier')->nullable()->after('shipping_status');
            $table->string('tracking_number')->nullable()->after('shipping_carrier');
            $table->timestamp('shipped_at')->nullable()->after('tracking_number');
            $table->timestamp('delivered_at')->nullable()->after('shipped_at');
        });
    }

    public function down(): void
    {
        Schema::table('trades', function (Blueprint $table) {
            $table->dropColumn(['shipping_status', 'shipping_carrier', 'tracking_number', 'shipped_at', 'delivered_at']);
        });
    }
};
