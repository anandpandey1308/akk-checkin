const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { initializeDatabase, getDb } = require('./database');
const SqliteSessionStore = require('./sessionStore');

initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3004;

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res, next) => {
  const hasSession = !!(req.session && req.session.user);
  const targetFile = hasSession ? 'original_dashboard.html' : 'index.html';
  const filePath = path.join(__dirname, '..', 'public', targetFile);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  next();
});

// Static frontend build (populated by `vite build` → copied here at deploy time)
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const hasSession = !!(req.session && req.session.user);
  const targetFile = hasSession ? 'original_dashboard.html' : 'index.html';
  const filePath = path.join(__dirname, '..', 'public', targetFile);
  
  if (!fs.existsSync(filePath)) {
    const defaultPath = path.join(__dirname, '..', 'public', 'index.html');
    if (!fs.existsSync(defaultPath)) {
      return res.status(200).json({ message: 'AKK Check-in System API — no frontend build in public/ yet' });
    }
    return res.sendFile(defaultPath);
  }
  
  res.sendFile(filePath);
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`AKK Check-in System running on http://localhost:${PORT}`);
});

module.exports = app;
