const express = require('express');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const apiRoutes = require('./routes/api-routes');

dotenv.config();

const app = express();
app.use(express.json());
app.use(helmet());

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 100,
  message: '❌ Too many requests, please try again later.',
});

app.use(limiter);

// Serve static files from public
app.use(express.static(path.join(__dirname, 'public')));

// Serve landing page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes under /api
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server jalan di port ${PORT}`);
});