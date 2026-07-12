const express = require('express');
const { getDb } = require('../database');
const { requireAuth } = require('../middleware/auth');
const { rowToCallQueueEntry } = require('../utils/mappers');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const e = req.body || {};
  if (!e.id || !e.docCode) return res.status(400).json({ error: 'id and docCode are required' });

  const db = getDb();
  const activeCamp = db.prepare('SELECT camp_no FROM camps WHERE active = 1').get();
  db.prepare(`
    INSERT INTO call_queue (id, doc_code, name, gk, queue, time, status, priority, camp_no)
    VALUES (@id, @docCode, @name, @gk, @queue, @time, @status, @priority, @campNo)
  `).run({
    id: e.id,
    docCode: e.docCode,
    name: e.name || null,
    gk: e.gk || null,
    queue: e.queue || null,
    time: e.time || null,
    status: e.status || 'sent',
    priority: e.priority ? 1 : 0,
    campNo: activeCamp ? activeCamp.camp_no : null,
  });

  const row = db.prepare('SELECT * FROM call_queue WHERE id = ?').get(e.id);
  res.status(201).json({ entry: rowToCallQueueEntry(row) });
});

router.patch('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status is required' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM call_queue WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Entry not found' });

  db.prepare('UPDATE call_queue SET status = ? WHERE id = ?').run(status, id);
  const row = db.prepare('SELECT * FROM call_queue WHERE id = ?').get(id);
  res.json({ entry: rowToCallQueueEntry(row) });
});

// Clear entries, optionally filtered by status (used for "clear done" in the
// UI). Scoped to the active camp — this is a per-camp working log, clearing
// it should never touch another camp's dispatch history.
router.delete('/', requireAuth, (req, res) => {
  const { status } = req.query;
  const db = getDb();
  const activeCamp = db.prepare('SELECT camp_no FROM camps WHERE active = 1').get();
  if (!activeCamp) return res.json({ message: 'Cleared' });
  if (status) db.prepare('DELETE FROM call_queue WHERE status = ? AND camp_no = ?').run(status, activeCamp.camp_no);
  else db.prepare('DELETE FROM call_queue WHERE camp_no = ?').run(activeCamp.camp_no);
  res.json({ message: 'Cleared' });
});

module.exports = router;
