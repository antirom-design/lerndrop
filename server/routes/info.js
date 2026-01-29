const express = require('express');
const editAuth = require('../middleware/edit-auth');
const { getUnit } = require('../lib/db');

const router = express.Router();

// Get unit info (requires edit token)
router.get('/:id', editAuth, (req, res) => {
  const { id } = req.params;
  const unit = getUnit(id);

  if (!unit) {
    return res.status(404).json({ error: 'Unit not found' });
  }

  res.json({
    id: unit.id,
    title: unit.title,
    createdAt: unit.created_at,
    updatedAt: unit.updated_at,
    sizeBytes: unit.size_bytes,
    fileCount: unit.file_count
  });
});

module.exports = router;
