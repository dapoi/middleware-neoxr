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

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 100,
  message: '❌ Too many requests, please try again later.',
});

app.use(limiter);

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

// API routes under /api
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server jalan di port ${PORT}`);
});