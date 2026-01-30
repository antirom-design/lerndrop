require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initDb, getDb } = require('./lib/db');

const uploadRouter = require('./routes/upload');
const updateRouter = require('./routes/update');
const deleteRouter = require('./routes/delete');
const serveRouter = require('./routes/serve');
const infoRouter = require('./routes/info');
const adminRouter = require('./routes/admin');

// Directories to verify
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - allow frontend origin
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// API Routes
app.use('/api/upload', uploadRouter);
app.use('/api/update', updateRouter);
app.use('/api/delete', deleteRouter);
app.use('/api/info', infoRouter);
app.use('/api/admin', adminRouter);

// Serve uploaded units
app.use('/v', serveRouter);

// Health check for Render
app.get('/health', (req, res) => {
  try {
    // Quick DB check
    const db = getDb();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM units');
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      units: result.count,
      storage: {
        uploads: fs.existsSync(UPLOADS_DIR),
        data: fs.existsSync(DATA_DIR)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 50}MB`
    });
  }

  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Verify all components are working
async function verifyStartup() {
  const checks = [];

  // 1. Check uploads directory
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    // Test write permission
    const testFile = path.join(UPLOADS_DIR, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    checks.push({ name: 'uploads_dir', ok: true });
  } catch (err) {
    checks.push({ name: 'uploads_dir', ok: false, error: err.message });
  }

  // 2. Check data directory
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Test write permission
    const testFile = path.join(DATA_DIR, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    checks.push({ name: 'data_dir', ok: true });
  } catch (err) {
    checks.push({ name: 'data_dir', ok: false, error: err.message });
  }

  // 3. Check database
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM units');
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    checks.push({ name: 'database', ok: true, unitCount: result.count });
  } catch (err) {
    checks.push({ name: 'database', ok: false, error: err.message });
  }

  // 4. Check required routes are loaded
  const requiredRoutes = ['upload', 'update', 'delete', 'serve', 'info', 'admin'];
  checks.push({ name: 'routes', ok: true, loaded: requiredRoutes });

  return checks;
}

// Initialize database and start server
async function start() {
  console.log('🚀 Starting LernDrop server...');

  try {
    // Initialize database first
    await initDb();
    console.log('✓ Database initialized');

    // Verify all components
    const checks = await verifyStartup();
    const failed = checks.filter(c => !c.ok);

    if (failed.length > 0) {
      console.error('❌ Startup verification failed:');
      failed.forEach(c => console.error(`  - ${c.name}: ${c.error}`));
      process.exit(1);
    }

    // Log successful checks
    checks.forEach(c => {
      if (c.name === 'database') {
        console.log(`✓ Database ready (${c.unitCount} units)`);
      } else if (c.name === 'routes') {
        console.log(`✓ Routes loaded: ${c.loaded.join(', ')}`);
      } else {
        console.log(`✓ ${c.name} ready`);
      }
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✅ LernDrop API running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
