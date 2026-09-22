<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Trade;
use App\Models\Product;
use App\Enums\TradeStatus;
use App\Notifications\TradeEventNotification;
use App\Models\Review;
use App\Models\UserBlock;
use Illuminate\Support\Facades\DB;

class TradeController extends Controller
{
    //gelen giden tüm takas isteklerini listeler
    public function index(Request $request)
    {
        $user = $request->user();
        //alıscısı olan kullanıcıya gelen
        $incoming = Trade::where('receiver_id', $user->id)
            ->with(['sender:id,name,profile_photo_path', 'offeredProduct', 'requestedProduct', 'extraProducts'])// gönderen ve ürün bilgilerini bağlama
            ->latest()// en yeni tekliften en eskiye doğru sıralama
            ->get();
        //göndererni olan kullanıcı takas teklifi çekme
        $outgoing = Trade::where('sender_id', $user->id)
            ->with(['receiver:id,name,profile_photo_path', 'offeredProduct', 'requestedProduct', 'extraProducts'])
            ->latest()
            ->get();

        // hangi takasları ben zaten değerlendirdim (arayüzde "Değerlendir" düğmesi için)
        $reviewed = Review::where('reviewer_id', $user->id)->pluck('trade_id')->flip();
        foreach ([$incoming, $outgoing] as $list) {
            $list->each(fn (Trade $t) => $t->setAttribute('reviewed', $reviewed->has($t->id)));
        }

        return response()->json([
            'incoming' => $incoming,
            'outgoing' => $outgoing
        ]);
    }
    //yeni takas teklifi oluşturma ve db kaydetme
    public function store(Request $request)
    {//ürün var mı kontrolü
        $request->validate([
            'offered_product_id' => 'required|exists:products,id',
            'requested_product_id' => 'required|exists:products,id',
            'cash_amount' => 'nullable|numeric|min:1|max:1000000',
            'cash_direction' => 'required_with:cash_amount|nullable|in:sender_pays,receiver_pays',
            'extra_offered_product_ids' => 'nullable|array|max:3',
            'extra_offered_product_ids.*' => 'integer|distinct|exists:products,id',
        ], [
            'cash_amount.numeric' => 'Geçerli bir tutar girin.',
            'cash_amount.min' => 'Geçerli bir tutar girin.',
            'cash_direction.required_with' => 'Nakit farkını kimin ödeyeceğini seçin.',
            'extra_offered_product_ids.max' => 'Bir teklifte en fazla 4 ürün verebilirsin.',
        ]);

        $sender = $request->user();
        $requestedProduct = Product::findOrFail($request->requested_product_id);
        $offeredProduct = Product::findOrFail($request->offered_product_id);

        //kullanıcı kendi ürününe teklif veremez
        if ((int) $requestedProduct->user_id === (int) $sender->id) {
            return response()->json(['message' => 'Kendi ürününüze teklif veremezsiniz.'], 400);
        }
        //sadece kendi ürününü takaslayabilir
        if ((int) $offeredProduct->user_id !== (int) $sender->id) {
            return response()->json(['message' => 'Sadece kendi ürününüzü teklif edebilirsiniz.'], 403);
        }
        //aralarında engel olan kullanıcılar takas teklifi gönderemez
        if (\App\Models\UserBlock::existsBetween((int) $sender->id, (int) $requestedProduct->user_id)) {
            return response()->json(['message' => 'Bu kullanıcıyla takas yapamazsın.'], 403);
        }
        //askıdaki hesabın ilanına teklif verilemez
        if (\App\Models\User::whereKey($requestedProduct->user_id)->whereNotNull('suspended_at')->exists()) {
            return response()->json(['message' => 'Bu ürün artık takas için uygun değil.'], 409);
        }
        //yalnızca satışa açık (takas kabul etmeyen) ilanlar takas teklifine konu olamaz
        if (!$requestedProduct->acceptsSwap() || !$offeredProduct->acceptsSwap()) {
            return response()->json(['message' => 'Bu ilan takasa açık değil.'], 409);
        }
        //ek ürünler: hepsi gönderene ait, takasa açık ve müsait olmalı; birincil ürünle aynı olamaz
        $extras = collect();
        if ($request->filled('extra_offered_product_ids')) {
            $extras = Product::whereIn('id', $request->input('extra_offered_product_ids'))->get();
            foreach ($extras as $extra) {
                if ((int) $extra->user_id !== (int) $sender->id || (int) $extra->id === (int) $offeredProduct->id) {
                    return response()->json(['message' => 'Sadece kendi ürünlerinizi teklif edebilirsiniz.'], 403);
                }
                if (!$extra->acceptsSwap() || in_array((int) $extra->status, [3, AdminController::STATUS_REMOVED], true)) {
                    return response()->json(['message' => 'Seçtiğin ürünlerden biri artık takas için uygun değil.'], 409);
                }
            }
        }
        //rezerve edilmiş ya da yayın süresi dolmuş ilana yeni teklif verilemez
        if ((int) $requestedProduct->status === Product::STATUS_RESERVED) {
            return response()->json(['message' => 'Bu ilan şu an rezerve edilmiş.'], 409);
        }
        if ($requestedProduct->is_expired) {
            return response()->json(['message' => 'Bu ilanın yayın süresi dolmuş.'], 409);
        }
        //takaslanmış (status=3) bir ürün için teklif oluşturulamaz
        if (in_array((int) $requestedProduct->status, [3, AdminController::STATUS_REMOVED], true)
            || in_array((int) $offeredProduct->status, [3, AdminController::STATUS_REMOVED], true)) {
            return response()->json(['message' => 'Bu ürün artık takas için uygun değil.'], 409);
        }
        //aynı ürün çifti için zaten bekleyen bir teklif varsa tekrar oluşturma
        $duplicate = Trade::where('sender_id', $sender->id)
            ->where('offered_product_id', $offeredProduct->id)
            ->where('requested_product_id', $requestedProduct->id)
            ->where('status', TradeStatus::Pending->value)
            ->exists();
        if ($duplicate) {
            return response()->json(['message' => 'Bu ürün için zaten bekleyen bir teklifiniz var.'], 409);
        }
        //buraya kadar ok'sa takas beklemeye alındı
        $trade = Trade::create([
            'sender_id' => $sender->id,
            'receiver_id' => $requestedProduct->user_id,
            'offered_product_id' => $offeredProduct->id,
            'requested_product_id' => $requestedProduct->id,
            'status' => TradeStatus::Pending,
            'cash_amount' => $request->cash_amount,
            'cash_direction' => $request->cash_amount ? $request->cash_direction : null,
        ]);

        if ($extras->isNotEmpty()) {
            $trade->extraProducts()->attach($extras->pluck('id')->all());
        }

        $this->notifyUser($requestedProduct->user, TradeEventNotification::OFFER_RECEIVED, $trade);

        return response()->json(['message' => 'Teklif başarıyla gönderildi.', 'trade' => $trade->load('extraProducts')], 201);
    }

    public function accept(Request $request, $id)
    {
        try {
            // Tüm okuma+yazma işlemleri tek transaction içinde: aynı ürün için
            // iki accept isteği aynı anda gelirse ikinci istek satır kilidini
            // bekler ve state guard sayesinde artık "beklemede" olmadığını görüp reddedilir.
            $result = DB::transaction(function () use ($request, $id) {
                $trade = Trade::lockForUpdate()->findOrFail($id);

                //teklifi sadece ürünü isteyen (alıcı olan) kişi kabul edebilir
                if ((int) $trade->receiver_id !== (int) $request->user()->id) {
                    abort(403, 'Bu işlemi yapmaya yetkiniz yok.');
                }

                //geçersiz state transition engeli: sadece "beklemede" olan bir teklif kabul edilebilir
                if ($trade->status !== TradeStatus::Pending) {
                    abort(409, 'Bu teklif zaten sonuçlandırılmış.');
                }

                // ürünleri de kilitleyerek race condition'ı tamamen kapat
                $offeredProduct = Product::lockForUpdate()->find($trade->offered_product_id);
                $requestedProduct = Product::lockForUpdate()->find($trade->requested_product_id);

                if (!$offeredProduct || !$requestedProduct) {
                    abort(404, 'Takasa konu ürünlerden biri artık mevcut değil.');
                }

                // ürünlerden biri bu sırada başka bir takasla zaten "Takaslandı" olduysa engelle
                if ((int) $offeredProduct->status === 3 || (int) $requestedProduct->status === 3) {
                    abort(409, 'Bu ürünlerden biri artık takas için uygun değil.');
                }

                // çoklu ürün teklifinde ek ürünler de kilitlenir ve hepsi müsait olmalı
                $extraProducts = Product::lockForUpdate()->whereIn('id', $trade->extraProducts()->pluck('products.id'))->get();
                foreach ($extraProducts as $extra) {
                    if (in_array((int) $extra->status, [3, AdminController::STATUS_REMOVED], true)) {
                        abort(409, 'Bu ürünlerden biri artık takas için uygun değil.');
                    }
                }

                // kargoyla gönderilebilecek bir ürün varsa kargo takibi "hazırlanıyor" ile başlar (ürün sahibi/receiver gönderir)
                $shippingStatus = $requestedProduct->shipping_enabled ? 'hazırlanıyor' : null;
                $trade->update(['status' => TradeStatus::Accepted, 'shipping_status' => $shippingStatus]);

                // tüm ürünleri Takaslandı (3) yap
                $allIds = $trade->allProductIds();
                Product::whereIn('id', $allIds)->update(['status' => 3]);

                // bu ürünlerden herhangi birine gelen diğer tüm beklemedeki teklifleri reddet
                Trade::where('id', '!=', $trade->id)
                    ->where('status', TradeStatus::Pending->value)
                    ->where(function ($query) use ($allIds) {
                        $query->whereIn('requested_product_id', $allIds)
                              ->orWhereIn('offered_product_id', $allIds)
                              ->orWhereHas('extraProducts', fn ($p) => $p->whereIn('products.id', $allIds));
                    })
                    ->update(['status' => TradeStatus::Rejected->value]);

                return $trade->sender;
            });

            $this->notifyUser($result, TradeEventNotification::OFFER_ACCEPTED, Trade::findOrFail($id));

            return response()->json([
                'message' => 'Teklif kabul edildi. İletişim bilgileri paylaşıldı.',
                'contact' => [
                    'partner_name' => $result->name,
                    'partner_phone' => $result->phone_number,
                    'partner_email' => $result->email,
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Teklif bulunamadı.'], 404);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getStatusCode());
        }
    }

    // alıcı bekleyen teklife karşı teklif verebilir: ilk teklif "karşı teklif" olur, roller ters çevrilerek yeni bir teklif açılır.
    // Yeni teklifte gönderen = ilk teklifin alıcısı (kendi ürününü verir), alıcı = ilk gönderen (istenen ürün değiştirilebilir).
    // cash_direction, karşı teklifi yapan kişiye göredir (sender_pays = karşı teklifi yapan öder).
    public function counter(Request $request, $id)
    {
        $request->validate([
            'requested_product_id' => 'nullable|integer|exists:products,id',
            'cash_amount' => 'nullable|numeric|min:1|max:1000000',
            'cash_direction' => 'required_with:cash_amount|nullable|in:sender_pays,receiver_pays',
        ], [
            'cash_amount.numeric' => 'Geçerli bir tutar girin.',
            'cash_amount.min' => 'Geçerli bir tutar girin.',
            'cash_direction.required_with' => 'Nakit farkını kimin ödeyeceğini seçin.',
        ]);

        try {
            $new = DB::transaction(function () use ($request, $id) {
                $trade = Trade::lockForUpdate()->findOrFail($id);

                if ((int) $trade->receiver_id !== (int) $request->user()->id) {
                    abort(403, 'Bu işlemi yapmaya yetkiniz yok.');
                }
                if ($trade->status !== TradeStatus::Pending) {
                    abort(409, 'Bu teklif zaten sonuçlandırılmış.');
                }
                if (UserBlock::existsBetween((int) $trade->sender_id, (int) $trade->receiver_id)) {
                    abort(403, 'Bu kullanıcıyla takas yapamazsın.');
                }

                $mine = Product::lockForUpdate()->find($trade->requested_product_id);
                $theirs = Product::lockForUpdate()->find($request->input('requested_product_id', $trade->offered_product_id));

                if (!$mine || !$theirs || (int) $theirs->user_id !== (int) $trade->sender_id) {
                    abort(422, 'İstediğin ürün karşı tarafa ait olmalı.');
                }
                foreach ([$mine, $theirs] as $p) {
                    if (in_array((int) $p->status, [3, AdminController::STATUS_REMOVED], true) || !$p->acceptsSwap()) {
                        abort(409, 'Bu ürün artık takas için uygun değil.');
                    }
                }
                $duplicate = Trade::where('sender_id', $mine->user_id)->where('offered_product_id', $mine->id)
                    ->where('requested_product_id', $theirs->id)->where('status', TradeStatus::Pending->value)->exists();
                if ($duplicate) {
                    abort(409, 'Bu ürün çifti için zaten bekleyen bir teklif var.');
                }

                $trade->update(['status' => TradeStatus::CounterOffered]);

                return Trade::create([
                    'sender_id' => $trade->receiver_id,
                    'receiver_id' => $trade->sender_id,
                    'offered_product_id' => $mine->id,
                    'requested_product_id' => $theirs->id,
                    'status' => TradeStatus::Pending,
                    'cash_amount' => $request->cash_amount,
                    'cash_direction' => $request->cash_amount ? $request->cash_direction : null,
                    'parent_trade_id' => $trade->id,
                ]);
            });

            $this->notifyUser($new->receiver, TradeEventNotification::OFFER_COUNTERED, $new);

            return response()->json(['message' => 'Karşı teklif gönderildi.', 'trade' => $new], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Teklif bulunamadı.'], 404);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getStatusCode());
        }
    }

    //alıcı bekleyen bir teklifi reddedebilir
    public function reject(Request $request, $id)
    {
        try {
            $trade = DB::transaction(function () use ($request, $id) {
                $trade = Trade::lockForUpdate()->findOrFail($id);

                if ((int) $trade->receiver_id !== (int) $request->user()->id) {
                    abort(403, 'Bu işlemi yapmaya yetkiniz yok.');
                }

                if ($trade->status !== TradeStatus::Pending) {
                    abort(409, 'Bu teklif zaten sonuçlandırılmış.');
                }

                $trade->update(['status' => TradeStatus::Rejected]);

                return $trade;
            });

            $this->notifyUser($trade->sender, TradeEventNotification::OFFER_REJECTED, $trade);

            return response()->json(['message' => 'Teklif reddedildi.', 'trade' => $trade]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Teklif bulunamadı.'], 404);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getStatusCode());
        }
    }

    //gönderen kendi bekleyen teklifini iptal edebilir
    public function cancel(Request $request, $id)
    {
        try {
            $trade = DB::transaction(function () use ($request, $id) {
                $trade = Trade::lockForUpdate()->findOrFail($id);

                if ((int) $trade->sender_id !== (int) $request->user()->id) {
                    abort(403, 'Bu işlemi yapmaya yetkiniz yok.');
                }

                if ($trade->status !== TradeStatus::Pending) {
                    abort(409, 'Bu teklif zaten sonuçlandırılmış.');
                }

                $trade->update(['status' => TradeStatus::Cancelled]);

                return $trade;
            });

            $this->notifyUser($trade->receiver, TradeEventNotification::OFFER_CANCELLED, $trade);

            return response()->json(['message' => 'Teklif iptal edildi.', 'trade' => $trade]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Teklif bulunamadı.'], 404);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getStatusCode());
        }
    }

    // Kargo durumu: yalnızca ürünü gönderen taraf (receiver) günceller; geriye gidemez, ödeme/gerçek kargo entegrasyonu yoktur
    public function updateShipping(Request $request, $id)
    {
        $data = $request->validate([
            'status' => 'required|in:kargoda,teslim edildi',
            'carrier' => 'required_if:status,kargoda|nullable|string|max:100',
            'tracking_number' => 'required_if:status,kargoda|nullable|string|max:100',
        ]);

        try {
            $trade = DB::transaction(function () use ($request, $id, $data) {
                $trade = Trade::lockForUpdate()->findOrFail($id);

                if ((int) $trade->receiver_id !== (int) $request->user()->id) {
                    abort(403, 'Kargo durumunu yalnızca ürünü gönderen taraf güncelleyebilir.');
                }
                if ($trade->status !== TradeStatus::Accepted) {
                    abort(409, 'Yalnızca onaylanmış takaslarda kargo durumu güncellenebilir.');
                }

                $order = ['hazırlanıyor' => 0, 'kargoda' => 1, 'teslim edildi' => 2];
                $current = $order[$trade->shipping_status] ?? 0;
                if ($order[$data['status']] <= $current) {
                    abort(409, 'Kargo durumu geriye alınamaz.');
                }

                $update = ['shipping_status' => $data['status']];
                if ($data['status'] === 'kargoda') {
                    $update['shipping_carrier'] = $data['carrier'];
                    $update['tracking_number'] = $data['tracking_number'];
                    $update['shipped_at'] = now();
                } else {
                    $update['delivered_at'] = now();
                }
                $trade->update($update);

                return $trade;
            });

            $this->notifyUser(
                $trade->sender,
                $data['status'] === 'kargoda' ? TradeEventNotification::OFFER_SHIPPED : TradeEventNotification::OFFER_DELIVERED,
                $trade->fresh(['sender', 'receiver', 'offeredProduct', 'requestedProduct'])
            );

            return response()->json(['message' => 'Kargo durumu güncellendi.', 'trade' => $trade]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Teklif bulunamadı.'], 404);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getStatusCode());
        }
    }

    // bildirim üretimi takas akışını asla bozmamalı: hata olursa loglanır, istek başarıyla devam eder
    private function notifyUser(?\App\Models\User $recipient, string $event, Trade $trade): void
    {
        if (!$recipient) {
            return;
        }

        try {
            $recipient->notify(new TradeEventNotification($event, $trade));
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
