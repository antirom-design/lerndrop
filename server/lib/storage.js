const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// File type icons for directory listing
const FILE_ICONS = {
  // Images
  '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.gif': '🖼️', '.webp': '🖼️', '.svg': '🖼️', '.ico': '🖼️', '.bmp': '🖼️',
  // Videos
  '.mp4': '🎬', '.webm': '🎬', '.mov': '🎬', '.avi': '🎬', '.mkv': '🎬',
  // Audio
  '.mp3': '🎵', '.wav': '🎵', '.ogg': '🎵', '.m4a': '🎵', '.flac': '🎵',
  // Documents
  '.pdf': '📄', '.doc': '📝', '.docx': '📝', '.txt': '📄', '.rtf': '📄',
  // Code
  '.html': '🌐', '.htm': '🌐', '.css': '🎨', '.js': '⚡', '.json': '📋', '.xml': '📋',
  '.py': '🐍', '.java': '☕', '.cpp': '⚙️', '.c': '⚙️', '.h': '⚙️',
  // Archives
  '.zip': '📦', '.rar': '📦', '.7z': '📦', '.tar': '📦', '.gz': '📦',
  // Data
  '.csv': '📊', '.xlsx': '📊', '.xls': '📊',
  // Other
  '.md': '📝', '.yaml': '📋', '.yml': '📋',
  'default': '📄',
  'folder': '📁'
};

// Files that browsers can display natively
const BROWSER_NATIVE_TYPES = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp',
  '.mp4', '.webm', '.mov',
  '.mp3', '.wav', '.ogg', '.m4a',
  '.pdf',
  '.html', '.htm', '.txt', '.css', '.js', '.json', '.xml'
];

function getUnitPath(id) {
  return path.join(UPLOADS_DIR, id);
}

function getFileIcon(filename, isDirectory = false) {
  if (isDirectory) return FILE_ICONS['folder'];
  const ext = path.extname(filename).toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS['default'];
}

function isBrowserNative(filename) {
  const ext = path.extname(filename).toLowerCase();
  return BROWSER_NATIVE_TYPES.includes(ext);
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function generateDirectoryIndex(dir, unitId, relativePath = '') {
  const items = fs.readdirSync(dir);
  const currentPath = relativePath || '/';

  let rows = '';

  // Add parent directory link if not at root
  if (relativePath) {
    const parentPath = path.dirname(relativePath) || '/';
    rows += `
      <tr>
        <td class="icon">📁</td>
        <td class="name"><a href="../">..</a></td>
        <td class="size">-</td>
        <td class="date">-</td>
      </tr>`;
  }

  // Sort: directories first, then files
  const sorted = items.sort((a, b) => {
    const aPath = path.join(dir, a);
    const bPath = path.join(dir, b);
    const aIsDir = fs.statSync(aPath).isDirectory();
    const bIsDir = fs.statSync(bPath).isDirectory();
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });

  for (const item of sorted) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    const isDir = stat.isDirectory();
    const icon = getFileIcon(item, isDir);
    const size = isDir ? '-' : formatFileSize(stat.size);
    const date = stat.mtime.toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const href = isDir ? `${item}/` : item;
    const target = !isDir && isBrowserNative(item) ? ' target="_blank"' : '';

    rows += `
      <tr>
        <td class="icon">${icon}</td>
        <td class="name"><a href="${href}"${target}>${item}${isDir ? '/' : ''}</a></td>
        <td class="size">${size}</td>
        <td class="date">${date}</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Index of ${currentPath}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      padding: 20px 24px;
    }
    header h1 {
      font-size: 1.25rem;
      font-weight: 600;
    }
    header .path {
      font-family: monospace;
      opacity: 0.9;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 12px 16px;
      background: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
      font-weight: 600;
      color: #6b7280;
      font-size: 0.875rem;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
    }
    tr:hover {
      background: #f9fafb;
    }
    .icon { width: 40px; text-align: center; font-size: 1.25rem; }
    .name { }
    .name a {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 500;
    }
    .name a:hover {
      text-decoration: underline;
    }
    .size {
      width: 100px;
      text-align: right;
      color: #6b7280;
      font-size: 0.875rem;
    }
    .date {
      width: 160px;
      text-align: right;
      color: #9ca3af;
      font-size: 0.875rem;
    }
    footer {
      padding: 16px 24px;
      background: #f9fafb;
      text-align: center;
      color: #9ca3af;
      font-size: 0.75rem;
    }
    footer a { color: #4f46e5; text-decoration: none; }
    @media (max-width: 640px) {
      .date { display: none; }
      .size { width: 80px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📂 Dateiübersicht</h1>
      <div class="path">${currentPath}</div>
    </header>
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th class="size">Grösse</th>
          <th class="date">Geändert</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <footer>
      Powered by <a href="/">LernDrop</a>
    </footer>
  </div>
</body>
</html>`;
}

function extractZip(zipBuffer, id) {
  const zip = new AdmZip(zipBuffer);
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
      const subContents = fs.readdirSync(subDir);
      for (const item of subContents) {
        fs.renameSync(
          path.join(subDir, item),
          path.join(targetDir, item)
        );
      }
      fs.rmdirSync(subDir);
    }
  }

  // Check if index.html exists, if not generate directory listing
  if (!fs.existsSync(path.join(targetDir, 'index.html'))) {
    const indexHtml = generateDirectoryIndex(targetDir, id);
    fs.writeFileSync(path.join(targetDir, 'index.html'), indexHtml);
  }

  // Calculate stats
  const stats = getDirectoryStats(targetDir);
  const title = extractTitle(targetDir);

  return {
    ...stats,
    title
  };
}

function saveFiles(files, id) {
  const targetDir = getUnitPath(id);

  // Create target directory
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Save each file, preserving relative paths
  for (const file of files) {
    // Get relative path from webkitRelativePath or use filename
    let relativePath = file.relativePath || file.originalname;

    // Remove leading directory if all files share the same parent
    const filePath = path.join(targetDir, relativePath);
    const fileDir = path.dirname(filePath);

    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    fs.writeFileSync(filePath, file.buffer);
  }

  // Flatten if all files are in a single subdirectory
  const contents = fs.readdirSync(targetDir);
  if (contents.length === 1) {
    const subDir = path.join(targetDir, contents[0]);
    if (fs.statSync(subDir).isDirectory()) {
      const subContents = fs.readdirSync(subDir);
      for (const item of subContents) {
        fs.renameSync(
          path.join(subDir, item),
          path.join(targetDir, item)
        );
      }
      fs.rmdirSync(subDir);
    }
  }

  // Check if index.html exists, if not generate directory listing
  if (!fs.existsSync(path.join(targetDir, 'index.html'))) {
    const indexHtml = generateDirectoryIndex(targetDir, id);
    fs.writeFileSync(path.join(targetDir, 'index.html'), indexHtml);
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

  // Check if it's our generated index
  if (content.includes('Powered by <a href="/">LernDrop</a>')) {
    // Extract path from generated index
    const pathMatch = content.match(/<div class="path">([^<]+)<\/div>/);
    return pathMatch ? `Dateien: ${pathMatch[1]}` : 'Dateiübersicht';
  }

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

function regenerateIndex(id, subPath = '') {
  const targetDir = path.join(getUnitPath(id), subPath);
  if (!fs.existsSync(targetDir)) return null;

  return generateDirectoryIndex(targetDir, id, '/' + subPath);
}

module.exports = {
  UPLOADS_DIR,
  getUnitPath,
  extractZip,
  saveFiles,
  deleteUnit,
  unitExists,
  regenerateIndex,
  generateDirectoryIndex,
  isBrowserNative
};
