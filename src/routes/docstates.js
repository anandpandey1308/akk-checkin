const express = require('express');
const { getDb } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.patch('/:code', requireAuth, (req, res) => {
  const code = req.params.code;
  const { state } = req.body || {};
  if (!['idle', 'calling', 'busy', 'absent'].includes(state)) {
    return res.status(400).json({ error: 'state must be idle, calling, busy, or absent' });
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO doc_states (doctor_code, state) VALUES (?, ?)
    ON CONFLICT(doctor_code) DO UPDATE SET state = excluded.state
  `).run(code, state);

  res.json({ doctorCode: code, state });
});

module.exports = router;
