// GET /api/state — single combined snapshot, polled by every connected device
// every few seconds so the check-in desk, calling screen, display board, and
// file-manager phones stay in sync without websockets.

const express = require('express');
const { getDb } = require('../database');
const { requireAuth } = require('../middleware/auth');
const { rowToLogEntry, rowToCallQueueEntry } = require('../utils/mappers');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const db = getDb();

  const activeCamp = db.prepare('SELECT camp_no, camp_date FROM camps WHERE active = 1').get() || null;

  // Scoped to the active camp so switching camps doesn't bleed one camp's
  // check-in queue into another's — see camp_no migration in database.js.
  const log = activeCamp
    ? db.prepare('SELECT * FROM log_entries WHERE camp_no = ? ORDER BY id DESC').all(activeCamp.camp_no).map(rowToLogEntry)
    : [];

  const docStates = {};
  db.prepare('SELECT * FROM doc_states').all().forEach(r => { docStates[r.doctor_code] = r.state; });

  // Scoped to the active camp too — was unscoped before, so "Call Log Today"
  // on the Calling Screen was actually showing every camp's dispatch history
  // ever, forever. See camp_no migration in database.js.
  const callQueue = activeCamp
    ? db.prepare('SELECT * FROM call_queue WHERE camp_no = ? ORDER BY id ASC').all(activeCamp.camp_no).map(rowToCallQueueEntry)
    : [];

  const qCounters = {};
  if (activeCamp) {
    db.prepare('SELECT * FROM q_counters WHERE camp_no = ?').all(activeCamp.camp_no).forEach(r => { qCounters[r.doctor_code] = r.counter; });
  }

  const doctors = db.prepare('SELECT doctor_code, doctor_name, display_hidden, calling_hidden FROM doctors WHERE active = 1 ORDER BY sort_order, doctor_code')
    .all().map(r => ({ code: r.doctor_code, name: r.doctor_name, displayHidden: !!r.display_hidden, callingHidden: !!r.calling_hidden }));

  res.json({ log, docStates, callQueue, qCounters, doctors, activeCamp });
});

module.exports = router;
