# Zeabur IPv4 Test Guide

## Langkah Test setelah Deploy ke Zeabur:

### 1. Test Basic Server
```bash
curl https://your-app.zeabur.app/api/debug
```

**Expected Response:**
```json
{
  "environment": "production",
  "api_key_configured": true,
  "api_key_length": 8,
  "base_url": "https://api.neoxr.my.id/api",
  "network_config": "IPv4 forced for outbound requests",
  "server_ip_family": "IPv4 (0.0.0.0)",
  "timestamp": "2025-01-XX..."
}
```

### 2. Test API Call dengan Log
```bash
curl "https://your-app.zeabur.app/api/fb?url=https://www.facebook.com/watch/?v=example"
```

### 3. Test App Config Protection
```bash
# Test access without login (should redirect)
curl -i "https://your-app.zeabur.app/app-config.html"

# Expected: 302 redirect to /admin/login?redirect=%2Fapp-config.html
```

### 4. Test Login Flow
1. Visit: `https://your-app.zeabur.app/admin/login`
2. Login with: `admin` / `luthfi13`
3. Should redirect to: `/app-config.html`
4. App config page should load successfully

**Check Zeabur Logs untuk:**
- `[NETWORK] Using IPv4 agent for outbound requests`
- `[ATTEMPT] 1/2 for fb`
- `[SUCCESS] fb ✓ (attempt 1)`

### 5. Indikator Success
✅ Server start: `🚀 Server jalan di port XXXX (IPv4)`
✅ Debug endpoint: `network_config: IPv4 forced`
✅ API calls: Reduced timeout errors
✅ Logs: IPv4 agent messages
✅ App config protected: Redirect to login when not authenticated
✅ Login works: Successful redirect to app-config after login

### 6. Jika ada masalah:
- Cek Zeabur environment variables
- Verify API_KEY = 4321lupa
- Monitor logs untuk error patterns

## Zeabur Platform Notes:
- ✅ Support `0.0.0.0` binding
- ✅ Support custom HTTP agents
- ✅ IPv4 outbound routing available
- ✅ No special configuration needed
