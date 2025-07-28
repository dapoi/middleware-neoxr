const bcrypt = require('bcryptjs');

// Simple in-memory auth config - use environment variables in production
const AUTH_CONFIG = {
  username: 'admin',
  // Password: 'luthfi22' (hashed)
  passwordHash: '$2b$10$80bkwSxJ2PnBYOnMHwQePOS4Htwgal7MZaOzWbm7B1wotDVm4rqvq'
};

// Middleware to check if user is authenticated (unified)
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  // If accessing HTML, redirect to login with redirect query
  if (req.originalUrl.endsWith('.html')) {
    return res.redirect('/admin/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// Login function
async function login(username, password) {
  if (username === AUTH_CONFIG.username) {
    const isValidPassword = await bcrypt.compare(password, AUTH_CONFIG.passwordHash);
    return isValidPassword;
  }
  return false;
}

// Change password function
async function changePassword(newPassword) {
  const saltRounds = 10;
  AUTH_CONFIG.passwordHash = await bcrypt.hash(newPassword, saltRounds);
  return true;
}

module.exports = {
  requireAuth,
  login,
  changePassword
};
