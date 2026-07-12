const express = require('express');
const { getDb } = require('../database');
const { requireAuth } = require('../middleware/auth');
const { rowToLogEntry } = require('../utils/mappers');

const router = express.Router();

// Add a check-in entry. id is client-supplied (Date.now() at scan time) —
// kept from the original build so the queue-number/entry pairing logic
// on the frontend didn't need to change.
//
// Queue number is assigned here, inside the same transaction as the insert
// — previously the frontend called a separate /api/queue/next to reserve a
// number, then a second request to create the row. If the second request
// ever failed (dropped connection, a double-fired confirm), the reserved
// number was burned with no row to show for it, leaving permanent gaps like
// "DS2 exists, DS1 never did". Doing both in one transaction means a number
// is only ever handed out together with its row.
router.post('/', requireAuth, (req, res) => {
  const e = req.body || {};
  if (!e.id || !e.gk || !e.name || !e.doctor) {
    return res.status(400).json({ error: 'id, gk, name, and doctor are required' });
  }

  const db = getDb();
  if (db.prepare('SELECT id FROM log_entries WHERE id = ?').get(e.id)) {
    return res.status(409).json({ error: 'Entry with this id already exists' });
  }

  const activeCamp = db.prepare('SELECT camp_no FROM camps WHERE active = 1').get();
  if (!activeCamp) {
    return res.status(400).json({ error: 'No active camp — activate a camp before checking in patients.' });
  }

  // Counter is keyed by (doctor_code, camp_no) — each camp's numbering
  // starts fresh at 1 and stays that camp's own permanent record even if
  // another camp is activated and later this one is reactivated.
  const queue = db.transaction(() => {
    db.prepare(`
      INSERT INTO q_counters (doctor_code, camp_no, counter) VALUES (?, ?, 1)
      ON CONFLICT(doctor_code, camp_no) DO UPDATE SET counter = counter + 1
    `).run(e.doctor, activeCamp.camp_no);
    const { counter } = db.prepare('SELECT counter FROM q_counters WHERE doctor_code = ? AND camp_no = ?').get(e.doctor, activeCamp.camp_no);
    const queueNumber = `${e.doctor}${counter}`;

    db.prepare(`
      INSERT INTO log_entries (id, gk, name, contact, doctor, doctor_name, queue, type, status, visits, time, priority, checked_in_by, camp_no)
      VALUES (@id, @gk, @name, @contact, @doctor, @doctorName, @queue, @type, @status, @visits, @time, @priority, @checkedInBy, @campNo)
    `).run({
      id: e.id,
      gk: e.gk,
      name: e.name,
      contact: e.contact || null,
      doctor: e.doctor,
      doctorName: e.doctorName || null,
      queue: queueNumber,
      type: e.type || 'followup',
      status: e.status || 'waiting',
      visits: e.visits ?? null,
      time: e.time || null,
      priority: e.priority ? 1 : 0,
      checkedInBy: req.session.user.name,
      campNo: activeCamp.camp_no,
    });

    return queueNumber;
  })();

  // Keep the patient master record's lifetime visit count current.
  if (e.type !== 'new') {
    db.prepare('UPDATE patients SET visits = visits + 1 WHERE gk = ?').run(e.gk);
  }

  const row = db.prepare('SELECT * FROM log_entries WHERE id = ?').get(e.id);
  res.status(201).json({ entry: rowToLogEntry(row) });
});

// Update status and/or fileStatus on an existing entry.
router.patch('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const existing = db.prepare('SELECT id FROM log_entries WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Entry not found' });

  const { status, fileStatus } = req.body || {};
  const updates = [];
  const params = { id };
  if (status !== undefined) { updates.push('status = @status'); params.status = status; }
  if (fileStatus !== undefined) {
    updates.push('file_status = @fileStatus', 'file_marked_by = @fileMarkedBy');
    params.fileStatus = fileStatus;
    params.fileMarkedBy = fileStatus ? req.session.user.name : null;
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  db.prepare(`UPDATE log_entries SET ${updates.join(', ')} WHERE id = @id`).run(params);

  const row = db.prepare('SELECT * FROM log_entries WHERE id = ?').get(id);
  res.json({ entry: rowToLogEntry(row) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  db.prepare('DELETE FROM log_entries WHERE id = ?').run(id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
