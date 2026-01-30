require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDb } = require('./lib/db');

const uploadRouter = require('./routes/upload');
const updateRouter = require('./routes/update');
const deleteRouter = require('./routes/delete');
const serveRouter = require('./routes/serve');
const infoRouter = require('./routes/info');
const adminRouter = require('./routes/admin');

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
  res.json({ status: 'ok' });
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

// Initialize database and start server
async function start() {
  try {
    await initDb();
    console.log('Database initialized');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`LernDrop API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
