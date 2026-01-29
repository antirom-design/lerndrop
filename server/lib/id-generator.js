const { nanoid } = require('nanoid');
const crypto = require('crypto');

// Generate a short, readable ID (8 characters)
function generateId() {
  return nanoid(8);
}

// Generate a cryptographically secure edit token (32 characters)
function generateEditToken() {
  return crypto.randomBytes(24).toString('base64url');
}

module.exports = {
  generateId,
  generateEditToken
};
