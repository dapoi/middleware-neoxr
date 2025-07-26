# Rate Limiting Configuration

## Overview
Aplikasi ini sekarang menggunakan dua tingkat rate limiting untuk mengontrol penggunaan API:

## Rate Limits

### 1. General Rate Limit
- **Endpoint**: Semua endpoint
- **Limit**: 100 requests per menit per IP
- **Pesan**: "❌ Too many requests, please try again later."

### 2. Download Rate Limit (dengan Burst Protection)
- **Endpoint**: Download endpoints khusus
  - `/api/fb` - Facebook video download
  - `/api/ig` - Instagram video download
  - `/api/tiktok` - TikTok video download
  - `/api/twitter` - Twitter video download
  - `/api/youtube` - YouTube video download
- **Limit Utama**: 15 requests per menit per IP
- **Burst Limit**: 5 requests per 20 detik per IP
- **Pesan Error**: 
  - Burst: "❌ Too many consecutive downloads. Please wait 20 seconds before downloading again."
  - Main: "❌ Download limit exceeded. Maximum 15 downloads per minute. Please try again later."
- **Cara Kerja**: User bisa download 5 file sekaligus, tapi harus jeda 20 detik sebelum burst berikutnya. Total tetap maksimal 15 per menit.

## Implementasi

Rate limiting menggunakan `express-rate-limit` package yang sudah ada di dependencies. 

### Cara Kerja:
1. Setiap request masuk melalui general rate limiter (100 req/menit)
2. Untuk endpoint download khusus, ada dua layer protection:
   - **Burst Limiter**: Maksimal 5 request berturut-turut dalam 20 detik
   - **Download Limiter**: Maksimal 15 request total dalam 1 menit
3. Jika salah satu limit terlampaui, user akan mendapat HTTP 429 status dengan pesan error yang sesuai

### Skenario Penggunaan:
- **Burst normal**: User bisa download 5 file sekaligus
- **Cooldown**: Harus tunggu 20 detik sebelum burst berikutnya
- **Total limit**: Dalam 1 menit, maksimal 15 download (bisa 3x burst @ 5 file)
- **Anti-abuse**: Mencegah spam requests sambil tetap user-friendly

### Headers Response:
Download endpoints akan mengembalikan header tambahan:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Time when rate limit resets

## Testing

Untuk test burst limiting:
1. Jalankan server: `npm start`
2. Buat 5 request sekaligus ke endpoint download - harus berhasil
3. Langsung buat request ke-6 - akan kena burst limit (429 error)
4. Tunggu 20 detik, bisa burst lagi 5 request
5. Dalam 1 menit total, maksimal 15 request berhasil

## Monitoring

Rate limit diterapkan per IP address. Setiap IP memiliki counter terpisah yang reset setiap menit.
