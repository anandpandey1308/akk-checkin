import express from 'express';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { logger } from './common/logger';
import { ErrorHandler } from './common/filters/ErrorHandler';
import { ApiResponse } from './common/responses/ApiResponse';

// We import the existing raw JS modules for now using require or import
// as part of the strangler fig migration strategy.
const { initializeDatabase, getDb } = require('./database');
const SqliteSessionStore = require('./sessionStore');

initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3004;

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

import { PatientRouter } from './modules/patients/patient.routes';

// Mount existing legacy routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/state', require('./routes/state'));
app.use('/api/log', require('./routes/log'));
app.use('/api/docstates', require('./routes/docstates'));
app.use('/api/callqueue', require('./routes/callqueue'));
app.use('/api/camps', require('./routes/camps'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/public', require('./routes/public'));

// Mount new modern modules
app.use('/api/patients', PatientRouter);

// Example of new standardized endpoint
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
  } catch (error: any) {
    dbSize = `error: ${error.message}`;
  }

  const memoryUsage = process.memoryUsage();

  res.json(ApiResponse.success({
    database: { exists: dbExists, size: dbSize },
    system: {
      nodeVersion: process.version,
      memory: {
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(1)} MB`
      }
    }
  }, 'Health check passed'));
});

// Static frontend build
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json(ApiResponse.error('API endpoint not found'));
  }
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(200).json({ message: 'No frontend build found' });
  }
  res.sendFile(indexPath);
});

// Centralized Global Error Handler MUST be the last middleware
app.use(ErrorHandler);

app.listen(PORT, () => {
  logger.info(`Enterprise API server started on port ${PORT}`);
});
