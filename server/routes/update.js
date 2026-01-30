const express = require('express');
const multer = require('multer');
const editAuth = require('../middleware/edit-auth');
const { extractZip, saveFiles, deleteUnit: deleteUnitFiles } = require('../lib/storage');
const { updateUnit } = require('../lib/db');

const router = express.Router();

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1000
  }
});

router.put('/:id', editAuth, upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { id } = req.params;

    // Delete old files
    deleteUnitFiles(id);

    let result;

    // Check if it's a single ZIP file
    if (req.files.length === 1) {
      const file = req.files[0];
      const isZip = file.mimetype === 'application/zip' ||
                    file.mimetype === 'application/x-zip-compressed' ||
                    file.originalname.endsWith('.zip');

      if (isZip) {
        result = extractZip(file.buffer, id);
      } else {
        const files = req.files.map(f => ({
          ...f,
          relativePath: req.body[`path_${f.fieldname}`] || f.originalname
        }));
        result = saveFiles(files, id);
      }
    } else {
      const files = req.files.map(f => ({
        ...f,
        relativePath: req.body[`path_${f.fieldname}`] || f.originalname
      }));
      result = saveFiles(files, id);
    }

    // Update database
    updateUnit(id, {
      title: result.title,
      sizeBytes: result.sizeBytes,
      fileCount: result.fileCount
    });

    res.json({
      success: true,
      message: 'Unit updated successfully',
      title: result.title,
      fileCount: result.fileCount,
      sizeBytes: result.sizeBytes
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
