<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trades', function (Blueprint $table) {
            $table->decimal('cash_amount', 12, 2)->nullable();
            $table->string('cash_direction', 16)->nullable(); // sender_pays | receiver_pays
            $table->unsignedBigInteger('parent_trade_id')->nullable()->index(); // karşı teklifin bağlı olduğu ilk teklif
        });
    }

    public function down(): void
    {
        Schema::table('trades', function (Blueprint $table) {
            $table->dropIndex(['parent_trade_id']);
            $table->dropColumn(['cash_amount', 'cash_direction', 'parent_trade_id']);
        });
    }
};
