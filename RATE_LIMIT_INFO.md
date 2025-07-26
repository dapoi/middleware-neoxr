# Rate Limiting Configuration

## Overview
Aplikasi ini sekarang menggunakan dua tingkat rate limiting untuk mengontrol penggunaan API:

## Rate Limits

### 1. General Rate Limit
- **Endpoint**: Semua endpoint
- **Limit**: 200 requests per menit per IP (balanced untuk multiple users)
- **Pesan**: "❌ Too many requests, please try again later."

### 2. Download Rate Limit (dengan Burst Protection)
- **Endpoint**: Download endpoints khusus
  - `/api/fb` - Facebook video download
  - `/api/ig` - Instagram video download
  - `/api/tiktok` - TikTok video download
  - `/api/twitter` - Twitter video download
  - `/api/youtube` - YouTube video download
- **Limit Utama**: 30 requests per menit per IP (balanced untuk API provider)
- **Burst Limit**: 10 requests per 20 detik per IP (prevent spam)
- **Pesan Error**: 
  - Burst: "❌ Too many consecutive downloads. Please wait 20 seconds before downloading again."
  - Main: "❌ Download limit exceeded. Maximum 30 downloads per minute. Please try again later."
- **Cara Kerja**: User bisa download 10 file sekaligus, tunggu 20 detik, ulangi. Total maksimal 30 per menit.

## Implementasi

Rate limiting menggunakan `express-rate-limit` package yang sudah ada di dependencies. 

### Cara Kerja:
1. Setiap request masuk melalui general rate limiter (100 req/menit)
2. Untuk endpoint download khusus, ada dua layer protection:
   - **Burst Limiter**: Maksimal 5 request berturut-turut dalam 20 detik
   - **Download Limiter**: Maksimal 15 request total dalam 1 menit
3. Jika salah satu limit terlampaui, user akan mendapat HTTP 429 status dengan pesan error yang sesuai

### Skenario Penggunaan:
- **Burst normal**: User bisa download 15 file sekaligus (naik dari 5)
- **Cooldown**: Harus tunggu 20 detik sebelum burst berikutnya
- **Total limit**: Dalam 1 menit, maksimal 50 download (bisa 3-4x burst @ 15 file)
- **Anti-abuse**: Mencegah spam requests sambil tetap user-friendly

### Headers Response:
Download endpoints akan mengembalikan header tambahan:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Time when rate limit resets

## Testing

Untuk test burst limiting:
1. Jalankan server: `npm start`
2. Buat 15 request sekaligus ke endpoint download - harus berhasil
3. Langsung buat request ke-16 - akan kena burst limit (429 error)
4. Tunggu 20 detik, bisa burst lagi 15 request
5. Dalam 1 menit total, maksimal 50 request berhasil

## Monitoring

Rate limit diterapkan per IP address. Setiap IP memiliki counter terpisah yang reset setiap menit.
