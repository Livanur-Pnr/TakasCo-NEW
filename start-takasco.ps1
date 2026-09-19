# TakasCo'yu tek komutla baslatir: backend (Laravel) + mobil (Expo web) ayri pencerelerde acilir
$root = $PSScriptRoot

Write-Host "TakasCo baslatiliyor..." -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; php artisan serve --host=0.0.0.0 --port=8000"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\mobile'; npx expo start --web"

Write-Host ""
Write-Host "Iki pencere acildi: biri backend, biri mobil sunucu icin." -ForegroundColor Cyan
Write-Host "Mobil pencerede 'Waiting on http://localhost:8081' yazisini gordukten sonra" -ForegroundColor Cyan
Write-Host "tarayicinda su adresi ac: http://localhost:8081" -ForegroundColor Cyan
