const express = require('express');
const multer = require('multer');
const { generateId, generateEditToken } = require('../lib/id-generator');
const { extractZip, saveFiles } = require('../lib/storage');
const { createUnit } = require('../lib/db');

const router = express.Router();

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1000 // Allow up to 1000 files for folder uploads
  }
});

router.post('/', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const id = generateId();
    const editToken = generateEditToken();

    let result;

    // Check if it's a single ZIP file
    if (req.files.length === 1) {
      const file = req.files[0];
      const isZip = file.mimetype === 'application/zip' ||
                    file.mimetype === 'application/x-zip-compressed' ||
                    file.originalname.endsWith('.zip');

      if (isZip) {
        // Extract ZIP
        result = extractZip(file.buffer, id);
      } else {
        // Single file upload - add relativePath from body if provided
        const files = req.files.map(f => ({
          ...f,
          relativePath: req.body[`path_${f.fieldname}`] || f.originalname
        }));
        result = saveFiles(files, id);
      }
    } else {
      // Multiple files - folder upload
      // Get relative paths from the request body
      const files = req.files.map(f => ({
        ...f,
        relativePath: req.body[`path_${f.fieldname}`] || f.originalname
      }));
      result = saveFiles(files, id);
    }

    // Save to database
    createUnit({
      id,
      editToken,
      title: result.title,
      sizeBytes: result.sizeBytes,
      fileCount: result.fileCount
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
      title: result.title,
      fileCount: result.fileCount,
      sizeBytes: result.sizeBytes
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
