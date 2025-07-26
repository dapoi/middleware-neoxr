const express = require('express');
const path = require('path');
const { requireAuthPage } = require('../utils/auth-middleware');
const router = express.Router();

// Serve landing page at root
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Serve privacy policy page
router.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'privacy-policy.html'));
});

// Serve license page
router.get('/license', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'license.html'));
});

// Serve app config page - Protected with authentication
router.get('/app-config.html', requireAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'app-config.html'));
});

module.exports = router;