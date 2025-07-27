const bcrypt = require('bcryptjs');

// Simple in-memory auth config - in production, use environment variables
const AUTH_CONFIG = {
  username: 'admin',
  // Password: 'luthfi13' (hashed)
  passwordHash: '$2b$10$zaPKHT2tqZwW9gIHA7Gvm.zqJeOjqvhwNxgxI0/0DjNmwdF1z/lAa'
};

// Middleware to check if user is authenticated (unified)
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  // Jika akses HTML, redirect ke login dengan query redirect
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
