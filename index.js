const express = require('express');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const session = require('express-session');
const path = require('path');
const apiRoutes = require('./routes/api-routes');
const pageRoutes = require('./routes/page-routes');
const { login } = require('./utils/auth-middleware');

dotenv.config();

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Safer: trusts only the first proxy
}
app.use(express.json());

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SESSION_SECRET) {
  console.warn('⚠️  WARNING: SESSION_SECRET is not set! Using default secret, this is insecure in production.');
}

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // true in production (HTTPS), false in development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: isProduction ? 'none' : 'lax' // 'none' required for cross-site cookies on Zeabur
  }
};

app.use(session(sessionConfig));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Helper to get client IP reliably behind proxies
const getClientIp = (req) => {
  return req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
};

// General rate limiter for all endpoints
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // Conservative: 50 requests per minute to avoid third party API blocking
  keyGenerator: getClientIp,
  message: '❌ Too many requests, please try again later.',
});

// Specific rate limiter for download endpoints with burst allowance
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Conservative: 30 downloads per minute to avoid third party API blocking
  keyGenerator: getClientIp,
  message: '❌ Download limit exceeded. Maximum 30 downloads per minute. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip failed requests (don't count them)
  skipFailedRequests: true,
  // Skip successful requests (count all requests)
  skipSuccessfulRequests: false,
});

// Burst protection - max 5 consecutive requests in 10 second window
const burstLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 second window
  max: 5, // Conservative: 5 requests in 10 seconds to avoid third party API blocking
  keyGenerator: getClientIp,
  message: '❌ Too many consecutive downloads. Please wait 10 seconds before downloading again.',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
});

// Specific rate limiter for admin login to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Maximum 5 attempts per minute
  keyGenerator: getClientIp,
  message: '❌ Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
});

app.use('/api', generalLimiter);

// Health check endpoints for Zeabur/platform health monitoring
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));

// Page routes (must be before static to ensure login protection works)
app.use('/', pageRoutes);

app.use(express.static(path.join(__dirname, 'public')));

// Admin login routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post('/admin/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  try {
    const isValid = await login(username, password);
    
    if (isValid) {
      req.session.authenticated = true;
      req.session.username = username;
      
      // Force session save
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        
        res.json({ success: true, message: 'Login successful' });
      });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// API routes under /api with download rate limiting for specific endpoints
// Middleware to restrict access to /api except for allowed endpoints
const allowedApiEndpoints = ['/', '/app-config', '/report', '/applemusic', '/auth-check', '/bardimg', '/douyin', '/fb', '/goimg', '/ig', '/meta', '/pin', '/pin-v2', '/pinterest-v2', '/pixiv', '/soundcloud', '/spotify', '/terabox', '/threads', '/tiktok', '/twitter', '/videy', '/youtube'];
const allowedPackageNames = ['com.dapascript.mever'];
app.use('/api', (req, res, next) => {
  // exception for /app-config and /report
  if (req.path.startsWith('/app-config') || req.path.startsWith('/report')) {
    return next();
  }
  const packageName = req.headers['x-package-name'];
  if (!allowedPackageNames.includes(packageName)) {
    return res.status(403).json({ error: 'Access is only allowed for the official app.' });
  }
  if (!allowedApiEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
    return res.status(403).json({ error: 'Access to this endpoint is not allowed.' });
  }
  // Apply download rate limiter to download endpoints
  const downloadEndpoints = ['/applemusic', '/bardimg', '/douyin', '/fb', '/goimg', '/ig', '/meta', '/pin', '/pin-v2', '/pinterest-v2', '/pixiv', '/soundcloud', '/spotify', '/terabox', '/threads', '/tiktok', '/twitter', '/videy', '/youtube'];
  const isDownloadEndpoint = downloadEndpoints.some(endpoint => req.path.startsWith(endpoint));
  if (isDownloadEndpoint) {
    burstLimiter(req, res, (err) => {
      if (err) return next(err);
      downloadLimiter(req, res, next);
    });
  } else {
    next();
  }
}, apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} (IPv4)`);
});