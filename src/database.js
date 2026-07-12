const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'akk_checkin.db');

let db;

function getDb() {
  if (!db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

// Single bootstrap admin. All other named accounts (per staffer, with a role)
// are created through the admin's Manage Users screen after first login.
const BOOTSTRAP_ADMIN = { name: 'Admin', username: 'admin', password: 'akk@admin32', role: 'admin' };

function initializeDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','checkin','display','doctor','filemanager')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    -- One active camp at a time. Doctors/patients below are tagged with the
    -- camp_no they were uploaded for. public_token gates the no-login
    -- /display/:token page — same pattern as akk-medicine-system's TV link.
    CREATE TABLE IF NOT EXISTS camps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camp_no INTEGER UNIQUE NOT NULL,
      camp_date TEXT,
      active INTEGER NOT NULL DEFAULT 0,
      public_token TEXT UNIQUE,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    -- Global roster, not camp-scoped — the same doctors tend to volunteer
    -- across camps. Re-uploading doctors.xlsx just upserts names/codes.
    -- sort_order is set from upload row order and drives display ordering;
    -- admin can rearrange it via drag-and-drop in Check-in's Doctor Reference.
    CREATE TABLE IF NOT EXISTS doctors (
      doctor_code TEXT PRIMARY KEY,
      doctor_name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      display_hidden INTEGER NOT NULL DEFAULT 0,
      calling_hidden INTEGER NOT NULL DEFAULT 0
    );

    -- Patient roster, replacing the old static PATIENT_DB bundle and the
    -- patient_overrides table — this IS the record now, editable in place.
    CREATE TABLE IF NOT EXISTS patients (
      gk TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      doctor_code TEXT,
      contact TEXT,
      expected_time TEXT,
      comment TEXT,
      visits INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 0,
      camp_no INTEGER,
      last_edited_at TEXT,
      FOREIGN KEY (doctor_code) REFERENCES doctors(doctor_code)
    );
    CREATE INDEX IF NOT EXISTS idx_patients_doctor ON patients(doctor_code);

    -- Today's check-in queue. id is client-supplied (Date.now() at check-in time),
    -- kept as-is from the original sessionStorage-only build. camp_no tags each
    -- entry to the camp active at check-in time, so switching the active camp
    -- doesn't mix one camp's queue into another's.
    CREATE TABLE IF NOT EXISTS log_entries (
      id INTEGER PRIMARY KEY,
      gk TEXT NOT NULL,
      name TEXT NOT NULL,
      contact TEXT,
      doctor TEXT NOT NULL,
      doctor_name TEXT,
      queue TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'followup',
      status TEXT NOT NULL DEFAULT 'waiting',
      file_status TEXT,
      visits INTEGER,
      time TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      checked_in_by TEXT,
      file_marked_by TEXT,
      camp_no INTEGER,
      created_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_log_status ON log_entries(status);
    CREATE INDEX IF NOT EXISTS idx_log_doctor ON log_entries(doctor);

    -- Calling-screen doctor state: idle | calling | busy
    CREATE TABLE IF NOT EXISTS doc_states (
      doctor_code TEXT PRIMARY KEY,
      state TEXT NOT NULL DEFAULT 'idle'
    );

    -- Walkie-talkie dispatch log, scoped per camp — see camp_no migration
    -- below, same convention as log_entries.
    CREATE TABLE IF NOT EXISTS call_queue (
      id INTEGER PRIMARY KEY,
      doc_code TEXT NOT NULL,
      name TEXT,
      gk TEXT,
      queue TEXT,
      time TEXT,
      status TEXT NOT NULL DEFAULT 'sent',
      priority INTEGER NOT NULL DEFAULT 0,
      camp_no INTEGER
    );

    -- Per-doctor queue number counters (JS1, JS2, ... ), scoped per camp so
    -- each camp's numbering starts fresh at 1 and a camp's history is
    -- preserved permanently even if it's reactivated later.
    CREATE TABLE IF NOT EXISTS q_counters (
      doctor_code TEXT NOT NULL,
      camp_no INTEGER NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (doctor_code, camp_no)
    );

    -- express-session storage. Backend runs under \`node --watch\` in dev, so
    -- every file save restarts the process — with the default in-memory
    -- session store that logs everyone out (every connected device, not just
    -- one) on every save. This table survives restarts. See sessionStore.js.
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expires INTEGER NOT NULL
    );
  `);

  // Lightweight migrations for columns added after the initial CREATE TABLE —
  // CREATE TABLE IF NOT EXISTS is a no-op on a DB that already has the table,
  // so new columns need an explicit ALTER TABLE guarded by a table_info check.
  const hasColumn = (table, column) =>
    db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);

  if (!hasColumn('log_entries', 'camp_no')) {
    db.exec('ALTER TABLE log_entries ADD COLUMN camp_no INTEGER');
    // Pre-migration rows predate multi-camp scoping — attribute them to
    // whichever camp is currently active so today's queue doesn't go blank.
    db.prepare(`
      UPDATE log_entries SET camp_no = (SELECT camp_no FROM camps WHERE active = 1)
      WHERE camp_no IS NULL
    `).run();
  }
  if (!hasColumn('doctors', 'display_hidden')) {
    db.exec('ALTER TABLE doctors ADD COLUMN display_hidden INTEGER NOT NULL DEFAULT 0');
  }
  if (!hasColumn('call_queue', 'priority')) {
    db.exec('ALTER TABLE call_queue ADD COLUMN priority INTEGER NOT NULL DEFAULT 0');
  }
  if (!hasColumn('doctors', 'calling_hidden')) {
    db.exec('ALTER TABLE doctors ADD COLUMN calling_hidden INTEGER NOT NULL DEFAULT 0');
  }
  if (!hasColumn('call_queue', 'camp_no')) {
    db.exec('ALTER TABLE call_queue ADD COLUMN camp_no INTEGER');
    // Pre-migration rows predate camp-scoping — attribute them to whichever
    // camp is currently active, same convention as log_entries above.
    db.prepare(`
      UPDATE call_queue SET camp_no = (SELECT camp_no FROM camps WHERE active = 1)
      WHERE camp_no IS NULL
    `).run();
  }
  if (!hasColumn('q_counters', 'camp_no')) {
    // Was a flat doctor_code -> counter map shared across every camp forever.
    // Camp-scoping it needs a composite key, which SQLite can't add via
    // ALTER TABLE — recreate the table instead. Pre-migration counters
    // predate multi-camp scoping — attribute them to whichever camp is
    // currently active, same convention as the log_entries migration above.
    db.exec('ALTER TABLE q_counters RENAME TO q_counters_old');
    db.exec(`
      CREATE TABLE q_counters (
        doctor_code TEXT NOT NULL,
        camp_no INTEGER NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (doctor_code, camp_no)
      )
    `);
    const activeCamp = db.prepare('SELECT camp_no FROM camps WHERE active = 1').get();
    if (activeCamp) {
      db.prepare(`
        INSERT INTO q_counters (doctor_code, camp_no, counter)
        SELECT doctor_code, ?, counter FROM q_counters_old
      `).run(activeCamp.camp_no);
    }
    db.exec('DROP TABLE q_counters_old');
  }

  const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (userCount === 0) {
    db.prepare(
      'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(BOOTSTRAP_ADMIN.name, BOOTSTRAP_ADMIN.username, bcrypt.hashSync(BOOTSTRAP_ADMIN.password, 10), BOOTSTRAP_ADMIN.role);
    console.log('--------------------------------------------------------');
    console.log('  Seeded bootstrap admin user');
    console.log(`  Username: ${BOOTSTRAP_ADMIN.username}`);
    console.log(`  Password: ${BOOTSTRAP_ADMIN.password}`);
    console.log('  Create named accounts for staff via Manage Users after logging in.');
    console.log('--------------------------------------------------------');
  }

  console.log('Database initialized at', DB_PATH);
}

module.exports = { getDb, initializeDatabase };
