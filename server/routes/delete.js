const express = require('express');
const editAuth = require('../middleware/edit-auth');
const { deleteUnit: deleteUnitFiles } = require('../lib/storage');
const { deleteUnit: deleteUnitDb } = require('../lib/db');

const router = express.Router();

router.delete('/:id', editAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete files
    deleteUnitFiles(id);

    // Delete from database
    deleteUnitDb(id);

    res.json({
      success: true,
      message: 'Unit deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
