# Deployment Debug Guide

## Masalah yang ditemukan
Error "Gagal ambil data dari Neoxr" hanya terjadi di deployment zeabur.app, sedangkan di local development berfungsi normal.

## Langkah debug untuk zeabur.app

1. **Cek environment variables**
   - Akses: `https://mever.zeabur.app/api/debug`
   - Pastikan `api_key_configured` adalah `true`
   - Pastikan `api_key_length` adalah `8`

2. **Cek log detail di zeabur.app**
   - Error sekarang akan menampilkan detail yang lebih lengkap
   - Log akan menunjukkan apakah API_KEY tersedia
   - Log akan menampilkan HTTP status code jika ada masalah koneksi

3. **Kemungkinan penyebab masalah:**
   - Environment variable `API_KEY` tidak ter-set di zeabur.app
   - Firewall/network restrictions di zeabur.app mengblokir akses ke `api.neoxr.my.id`
   - Dependency `node-fetch` tidak ter-install dengan benar
   - Network timeout - API provider lambat merespons
   - Rate limiting dari API provider (flood protection)
   - Penggunaan domain yang salah (harus api.neoxr.my.id sesuai ToS)

## Solusi yang harus dicoba:

### 1. Set Environment Variables di Zeabur
Pastikan variabel berikut sudah di-set di dashboard zeabur:
```
API_KEY=4321lupa
NODE_ENV=production
```

### 2. Tambahkan timeout pada fetch request
Update `utils/forward-request.js` dengan timeout:
```javascript
const response = await fetch(url, {
  timeout: 30000, // 30 seconds timeout (sudah diterapkan)
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; NeoxrProxy/1.0)'
  }
});
```

### 3. Retry mechanism untuk handle timeout
Sistem retry otomatis sudah ditambahkan:
- Maximum 2 attempts untuk request yang timeout
- Delay 2 detik antar retry
- Smart retry hanya untuk error yang recoverable (timeout, connection reset)
- HTTP 404/401/403 tidak di-retry karena permanent error

### 3. Test koneksi langsung
Test akses ke `https://mever.zeabur.app/api/debug` untuk memastikan:
- API key tersedia
- Environment sudah benar

### 4. Verifikasi dependencies
Pastikan `package.json` sudah benar dan semua dependencies ter-install:
```json
{
  "dependencies": {
    "node-fetch": "^2.6.1",
    "dotenv": "^16.0.3",
    "express": "^4.18.2"
  }
}
```

## Improved error handling sudah ditambahkan:
- Detailed error logging
- API key availability check
- HTTP status code checking
- Better error messages dengan details

## Next steps:
1. Deploy perubahan terbaru ke zeabur.app
2. Test endpoint `/api/debug`
3. Test endpoint dengan URL Facebook yang sama
4. Analisis log error yang lebih detail
