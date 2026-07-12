// No-auth routes gated by a per-camp public_token instead of a session —
// same pattern as akk-medicine-system's /public/tv/:token. Anyone with the
// link can view the live queue; nothing here accepts writes.

const express = require('express');
const { getDb } = require('../database');
const { rowToLogEntry } = require('../utils/mappers');

const router = express.Router();

router.get('/display', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const db = getDb();
  const camp = db.prepare('SELECT camp_no, camp_date, active FROM camps WHERE public_token = ?').get(token);
  if (!camp) return res.status(404).json({ error: 'Invalid display link' });
  if (!camp.active) return res.status(404).json({ error: 'This camp is no longer active' });

  const log = db.prepare('SELECT * FROM log_entries WHERE camp_no = ? ORDER BY id DESC').all(camp.camp_no).map(rowToLogEntry);
  const doctors = db.prepare('SELECT doctor_code, doctor_name FROM doctors WHERE active = 1 AND display_hidden = 0 ORDER BY sort_order, doctor_code')
    .all().map(r => ({ code: r.doctor_code, name: r.doctor_name }));

  res.json({
    camp: { campNo: camp.camp_no, campDate: camp.camp_date },
    log,
    doctors,
  });
});

module.exports = router;
