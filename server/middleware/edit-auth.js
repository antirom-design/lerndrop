const { validateEditToken } = require('../lib/db');

function editAuth(req, res, next) {
  const { id } = req.params;
  const token = req.headers['x-edit-token'];

  if (!token) {
    return res.status(401).json({ error: 'Edit token required' });
  }

  if (!validateEditToken(id, token)) {
    return res.status(403).json({ error: 'Invalid edit token' });
  }

  next();
}

module.exports = editAuth;
