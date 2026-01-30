const express = require('express');
const { getDb } = require('../lib/db');
const { deleteUnit: deleteUnitFiles, getDirectoryStats, getUnitPath } = require('../lib/storage');
const { deleteUnit: deleteUnitDb } = require('../lib/db');
const fs = require('fs');

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234';

// Simple password check middleware
function adminAuth(req, res, next) {
  const password = req.headers['x-admin-password'] || req.query.password;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// Get all units
router.get('/units', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM units ORDER BY created_at DESC');

    const units = [];
    while (stmt.step()) {
      const unit = stmt.getAsObject();

      // Check if files still exist
      const unitPath = getUnitPath(unit.id);
      unit.filesExist = fs.existsSync(unitPath);

      units.push({
        id: unit.id,
        title: unit.title,
        createdAt: unit.created_at,
        updatedAt: unit.updated_at,
        sizeBytes: unit.size_bytes,
        fileCount: unit.file_count,
        filesExist: unit.filesExist
      });
    }
    stmt.free();

    res.json({ units });
  } catch (error) {
    console.error('Admin list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a unit
router.delete('/units/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;

    // Delete files
    deleteUnitFiles(id);

    // Delete from database
    deleteUnitDb(id);

    res.json({ success: true, message: 'Unit deleted' });
  } catch (error) {
    console.error('Admin delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify password
router.post('/verify', (req, res) => {
  const password = req.headers['x-admin-password'] || req.body.password;

  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

module.exports = router;
