const bcrypt = require('bcryptjs');

// Generate password hash
async function generatePasswordHash(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('\nCopy this hash to auth-middleware.js passwordHash field');
}

// Default password generation
if (process.argv.length > 2) {
  generatePasswordHash(process.argv[2]);
} else {
  console.log('Usage: node generate-password.js [password]');
  console.log('Example: node generate-password.js mynewpassword');
}
