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
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

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

// General rate limiter for all endpoints
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 200, // Lebih conservative: 200 requests per menit
  message: '❌ Too many requests, please try again later.',
});

// Specific rate limiter for download endpoints with burst allowance
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 30, // Lebih conservative: 30 per menit
  message: '❌ Download limit exceeded. Maximum 30 downloads per minute. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip failed requests (don't count them)
  skipFailedRequests: true,
  // Skip successful requests (count all requests)
  skipSuccessfulRequests: false,
});

// Burst protection - max 10 consecutive requests, then 20 second cooldown
const burstLimiter = rateLimit({
  windowMs: 20 * 1000, // 20 detik window
  max: 10, // Lebih conservative: 10 request dalam 20 detik
  message: '❌ Too many consecutive downloads. Please wait 20 seconds before downloading again.',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
});

app.use(generalLimiter);

// Serve static files from public
app.use(express.static(path.join(__dirname, 'public')));

// Admin login routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  try {
    const isValid = await login(username, password);
    if (isValid) {
      req.session.authenticated = true;
      req.session.username = username;
      res.json({ success: true, message: 'Login successful' });
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

// Page routes
app.use('/', pageRoutes);

// API routes under /api with download rate limiting for specific endpoints
app.use('/api', (req, res, next) => {
  // Apply download rate limiter to download endpoints
  const downloadEndpoints = ['/fb', '/ig', '/tiktok', '/twitter', '/youtube'];
  const isDownloadEndpoint = downloadEndpoints.some(endpoint => req.path.startsWith(endpoint));
  
  if (isDownloadEndpoint) {
    // Apply burst limiter first (5 requests per 20 seconds)
    burstLimiter(req, res, (err) => {
      if (err) return next(err);
      // Then apply download limiter (15 requests per minute)
      downloadLimiter(req, res, next);
    });
  } else {
    next();
  }
}, apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server jalan di port ${PORT}`);
});