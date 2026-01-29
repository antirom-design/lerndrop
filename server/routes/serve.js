const express = require('express');
const path = require('path');
const fs = require('fs');
const { getUnitPath, unitExists } = require('../lib/storage');
const { getUnit } = require('../lib/db');

const router = express.Router();

router.get('/:id', (req, res) => {
  const { id } = req.params;

  if (!unitExists(id)) {
    return res.status(404).send('Unit not found');
  }

  // Redirect to index.html
  res.redirect(`/v/${id}/index.html`);
});

router.get('/:id/*', (req, res) => {
  const { id } = req.params;
  const filePath = req.params[0] || 'index.html';

  if (!unitExists(id)) {
    return res.status(404).send('Unit not found');
  }

  const fullPath = path.join(getUnitPath(id), filePath);
  const unitPath = getUnitPath(id);

  // Security: ensure the requested file is within the unit directory
  const resolvedPath = path.resolve(fullPath);
  const resolvedUnitPath = path.resolve(unitPath);

  if (!resolvedPath.startsWith(resolvedUnitPath)) {
    return res.status(403).send('Access denied');
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('File not found');
  }

  // Set cache headers
  res.set('Cache-Control', 'public, max-age=3600');

  res.sendFile(fullPath);
});

module.exports = router;
