const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function getUnitPath(id) {
  return path.join(UPLOADS_DIR, id);
}

function extractZip(zipBuffer, id) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  // Validate: must contain index.html
  const hasIndex = entries.some(entry => {
    const entryName = entry.entryName.toLowerCase();
    // Check for index.html at root or in a single subdirectory
    return entryName === 'index.html' || entryName.endsWith('/index.html');
  });

  if (!hasIndex) {
    throw new Error('ZIP must contain an index.html file');
  }

  const targetDir = getUnitPath(id);

  // Create target directory
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Extract files
  zip.extractAllTo(targetDir, true);

  // If all files are in a single subdirectory, move them up
  const contents = fs.readdirSync(targetDir);
  if (contents.length === 1) {
    const subDir = path.join(targetDir, contents[0]);
    if (fs.statSync(subDir).isDirectory()) {
      // Check if index.html is in the subdirectory
      if (fs.existsSync(path.join(subDir, 'index.html'))) {
        // Move all files from subdirectory to parent
        const subContents = fs.readdirSync(subDir);
        for (const item of subContents) {
          fs.renameSync(
            path.join(subDir, item),
            path.join(targetDir, item)
          );
        }
        // Remove empty subdirectory
        fs.rmdirSync(subDir);
      }
    }
  }

  // Calculate stats
  const stats = getDirectoryStats(targetDir);
  const title = extractTitle(targetDir);

  return {
    ...stats,
    title
  };
}

function getDirectoryStats(dir) {
  let totalSize = 0;
  let fileCount = 0;

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else {
        totalSize += stat.size;
        fileCount++;
      }
    }
  }

  traverse(dir);
  return { sizeBytes: totalSize, fileCount };
}

function extractTitle(dir) {
  const indexPath = path.join(dir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return null;
  }

  const content = fs.readFileSync(indexPath, 'utf-8');
  const match = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function deleteUnit(id) {
  const unitPath = getUnitPath(id);
  if (fs.existsSync(unitPath)) {
    fs.rmSync(unitPath, { recursive: true, force: true });
  }
}

function unitExists(id) {
  return fs.existsSync(getUnitPath(id));
}

module.exports = {
  UPLOADS_DIR,
  getUnitPath,
  extractZip,
  deleteUnit,
  unitExists
};
