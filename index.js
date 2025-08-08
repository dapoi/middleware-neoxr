const express = require('express');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const redis = require('redis');
const path = require('path');
const apiRoutes = require('./routes/api-routes');
const pageRoutes = require('./routes/page-routes');
const { login, requireAuth } = require('./utils/auth-middleware');

dotenv.config();

const app = express();

// Create Redis client with proper error handling
let redisClient;
let isRedisConnected = false;
let redisErrorLogged = false;

// Only attempt Redis connection if environment variables are properly set
const shouldUseRedis = process.env.REDIS_HOST || process.env.NODE_ENV === 'development';

if (shouldUseRedis) {
  try {
    redisClient = redis.createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined,
      database: process.env.REDIS_DB || 0,
      socket: {
        connectTimeout: 5000, // 5 second timeout
        lazyConnect: true,    // Don't connect immediately
        reconnectStrategy: false, // Disable automatic reconnection
      }
    });

    // Handle errors gracefully - only log once
    redisClient.on('error', (err) => {
      if (!redisErrorLogged) {
        console.warn('⚠️  Redis connection failed:', err.message);
        console.warn('📝 Using MemoryStore for sessions (fallback mode)');
        redisErrorLogged = true;
      }
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Connected to Redis for session storage');
      isRedisConnected = true;
      redisErrorLogged = false;
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis client ready');
      isRedisConnected = true;
    });

    redisClient.on('end', () => {
      isRedisConnected = false;
    });

    // Attempt connection with timeout
    const connectWithTimeout = async () => {
      try {
        await Promise.race([
          redisClient.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          )
        ]);
      } catch (err) {
        if (!redisErrorLogged) {
          console.warn('⚠️  Redis connection failed:', err.message);
          console.warn('📝 Using MemoryStore for sessions (fallback mode)');
          redisErrorLogged = true;
        }
        redisClient = null;
        isRedisConnected = false;
      }
    };

    connectWithTimeout();
  } catch (error) {
    if (!redisErrorLogged) {
      console.warn('⚠️  Failed to create Redis client:', error.message);
      console.warn('📝 Using MemoryStore for sessions (fallback mode)');
      redisErrorLogged = true;
    }
    redisClient = null;
    isRedisConnected = false;
  }
} else {
  console.log('📝 Redis not configured - using MemoryStore for sessions');
  console.log('💡 To use Redis in production, set REDIS_HOST environment variable');
  redisClient = null;
}

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Safer: trusts only the first proxy
}
app.use(express.json());

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Configure session store
if (redisClient && !redisErrorLogged) {
  try {
    sessionConfig.store = new RedisStore({ 
      client: redisClient,
      prefix: 'neoxr:sess:',
      ttl: 86400, // 24 hours in seconds
      disableTouch: true, // Improve performance
      disableTTL: false
    });
    console.log('✅ Redis session store configured');
  } catch (error) {
    console.warn('⚠️  Failed to create Redis store:', error.message);
    console.warn('📝 Using MemoryStore for sessions (fallback mode)');
  }
} else if (!shouldUseRedis) {
  // Intentionally using MemoryStore
  console.log('📝 Session store: MemoryStore (development mode)');
} else {
  console.log('📝 Session store: MemoryStore (Redis unavailable)');
}

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

// General rate limiter for all endpoints
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // More conservative: 200 requests per minute
  message: '❌ Too many requests, please try again later.',
});

// Specific rate limiter for download endpoints with burst allowance
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // More conservative: 30 per minute
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
  windowMs: 20 * 1000, // 20 second window
  max: 10, // More conservative: 10 requests in 20 seconds
  message: '❌ Too many consecutive downloads. Please wait 20 seconds before downloading again.',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
});

app.use(generalLimiter);

// Page routes (must be before static to ensure login protection works)
app.use('/', pageRoutes);

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
// Middleware to restrict access to /api except for allowed endpoints
const allowedApiEndpoints = ['/', '/app-config', '/auth-check', '/fb', '/ig', '/meta', '/pin-v2', '/terabox', '/threads', '/tiktok', '/twitter', '/videy', '/youtube'];
const allowedPackageNames = ['com.dapascript.mever'];
app.use('/api', (req, res, next) => {
  // exception for /app-config
  if (req.path.startsWith('/app-config')) {
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
  const downloadEndpoints = ['/fb', '/ig', '/meta', '/pin-v2', '/terabox', '/threads', '/tiktok', '/twitter', '/videy', '/youtube'];
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