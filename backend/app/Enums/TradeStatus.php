<?php

namespace App\Enums;

// Mevcut 'trades.status' string kolonuyla tam uyumlu, backward-compatible enum.
// DB'de hâlâ aynı Türkçe string değerler saklanır; mobil/web client hiçbir
// değişiklik yapmadan çalışmaya devam eder. Bu enum sadece backend tarafında
// state transition'ları güvenli ve okunabilir hale getirir.
enum TradeStatus: string
{
    case Pending = 'beklemede';
    case Accepted = 'onaylandı';
    case Rejected = 'reddedildi';
    case Cancelled = 'iptal edildi';
    case CounterOffered = 'karşı teklif'; // alıcı karşı teklif verdiğinde ilk teklif bu duruma geçer
}
