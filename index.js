const express = require('express');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes/api-routes');

dotenv.config();

const app = express();
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 100,
  message: '❌ Too many requests, please try again later.',
});

app.use(limiter);
app.use('/', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server jalan di port ${PORT}`);
});
