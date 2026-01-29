const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/lerndrop.db');

let db = null;

async function initDb() {
  const SQL = await initSqlJs();

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      edit_token TEXT NOT NULL,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      size_bytes INTEGER,
      file_count INTEGER
    )
  `);

  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

function createUnit({ id, editToken, title, sizeBytes, fileCount }) {
  const db = getDb();
  db.run(
    `INSERT INTO units (id, edit_token, title, size_bytes, file_count)
     VALUES (?, ?, ?, ?, ?)`,
    [id, editToken, title, sizeBytes, fileCount]
  );
  saveDb();
}

function getUnit(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM units WHERE id = ?');
  stmt.bind([id]);

  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function updateUnit(id, { title, sizeBytes, fileCount }) {
  const db = getDb();
  db.run(
    `UPDATE units SET title = ?, size_bytes = ?, file_count = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [title, sizeBytes, fileCount, id]
  );
  saveDb();
}

function deleteUnit(id) {
  const db = getDb();
  db.run('DELETE FROM units WHERE id = ?', [id]);
  saveDb();
}

function validateEditToken(id, token) {
  const unit = getUnit(id);
  return unit && unit.edit_token === token;
}

module.exports = {
  initDb,
  getDb,
  saveDb,
  createUnit,
  getUnit,
  updateUnit,
  deleteUnit,
  validateEditToken
};
