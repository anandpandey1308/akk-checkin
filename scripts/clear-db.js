const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'akk_checkin.db');
const BOOTSTRAP_ADMIN = { name: 'Admin', username: 'admin', password: 'akk@admin32', role: 'admin' };

function clearDb() {
  console.log('Opening database at:', DB_PATH);
  const db = new Database(DB_PATH);

  try {
    db.transaction(() => {
      console.log('Clearing database tables...');
      db.prepare('DELETE FROM log_entries').run();
      db.prepare('DELETE FROM call_queue').run();
      db.prepare('DELETE FROM q_counters').run();
      db.prepare('DELETE FROM doc_states').run();
      db.prepare('DELETE FROM patients').run();
      db.prepare('DELETE FROM doctors').run();
      db.prepare('DELETE FROM camps').run();
      db.prepare('DELETE FROM sessions').run();
      db.prepare('DELETE FROM users').run();

      console.log('Restoring bootstrap admin user...');
      db.prepare(
        'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)'
      ).run(BOOTSTRAP_ADMIN.name, BOOTSTRAP_ADMIN.username, bcrypt.hashSync(BOOTSTRAP_ADMIN.password, 10), BOOTSTRAP_ADMIN.role);
    })();
    console.log('Success! Database cleared (admin preserved).');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    db.close();
  }
}

clearDb();
