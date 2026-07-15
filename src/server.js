const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { initializeDatabase, getDb } = require('./database');
const SqliteSessionStore = require('./sessionStore');

initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3004;

// Trust the proxy (Fly.io edge router) to allow secure session cookies over HTTPS
app.set('trust proxy', 1);

app.use(express.json({ limit: '2mb' }));

app.use(session({
  name: 'akk_checkin_session',
  secret: process.env.SESSION_SECRET || 'akk-checkin-system-secret-change-in-prod',
  store: new SqliteSessionStore(getDb()),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/state', require('./routes/state'));
app.use('/api/log', require('./routes/log'));
app.use('/api/docstates', require('./routes/docstates'));
app.use('/api/callqueue', require('./routes/callqueue'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/camps', require('./routes/camps'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/public', require('./routes/public')); // no session middleware — token-gated instead

app.get('/api/health', (req, res) => {
  const dbPath = path.join(__dirname, '..', 'data', 'akk_checkin.db');
  let dbSize = 'unknown';
  let dbExists = false;

  try {
    if (fs.existsSync(dbPath)) {
      dbExists = true;
      const stats = fs.statSync(dbPath);
      dbSize = `${(stats.size / 1024 / 1024).toFixed(2)} MB`;
    }
  } catch (error) {
    dbSize = `error: ${error.message}`;
  }

  const memoryUsage = process.memoryUsage();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(1)}s`,
    database: {
      exists: dbExists,
      size: dbSize,
      path: dbPath
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(1)} MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`,
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`
      }
    }
  });
});

// Static frontend build (populated by `vite build` → copied here at deploy time)
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(200).json({ message: 'AKK Check-in System API — no frontend build in public/ yet' });
  }
  res.sendFile(indexPath);
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`AKK Check-in System running on http://localhost:${PORT}`);
});

module.exports = app;
