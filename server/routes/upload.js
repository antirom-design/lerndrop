const express = require('express');
const multer = require('multer');
const { generateId, generateEditToken } = require('../lib/id-generator');
const { extractZip } = require('../lib/storage');
const { createUnit } = require('../lib/db');

const router = express.Router();

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const id = generateId();
    const editToken = generateEditToken();

    // Extract ZIP and get metadata
    const { title, sizeBytes, fileCount } = extractZip(req.file.buffer, id);

    // Save to database
    createUnit({
      id,
      editToken,
      title,
      sizeBytes,
      fileCount
    });

    // Backend URL for serving files
    const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
    // Frontend URL for edit page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    res.json({
      success: true,
      id,
      viewUrl: `${apiUrl}/v/${id}`,
      editUrl: `${frontendUrl}/edit.html#${id}/${editToken}`,
      title,
      fileCount,
      sizeBytes
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
