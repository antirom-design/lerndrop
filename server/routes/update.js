const express = require('express');
const multer = require('multer');
const editAuth = require('../middleware/edit-auth');
const { extractZip, deleteUnit: deleteUnitFiles } = require('../lib/storage');
const { updateUnit } = require('../lib/db');

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

router.put('/:id', editAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { id } = req.params;

    // Delete old files
    deleteUnitFiles(id);

    // Extract new ZIP
    const { title, sizeBytes, fileCount } = extractZip(req.file.buffer, id);

    // Update database
    updateUnit(id, { title, sizeBytes, fileCount });

    res.json({
      success: true,
      message: 'Unit updated successfully',
      title,
      fileCount,
      sizeBytes
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
