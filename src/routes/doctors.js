const express = require('express');
const { getDb } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const doctors = db.prepare('SELECT doctor_code, doctor_name, active, display_hidden, calling_hidden FROM doctors ORDER BY sort_order, doctor_code').all();
  res.json({ doctors: doctors.map(d => ({ code: d.doctor_code, name: d.doctor_name, active: !!d.active, displayHidden: !!d.display_hidden, callingHidden: !!d.calling_hidden })) });
});

// One-off add/edit outside the bulk Excel import. New doctors go to the end.
router.post('/', requireAdmin, (req, res) => {
  const { code, name } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' });

  const db = getDb();
  const nextOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) m FROM doctors').get().m) + 1;
  db.prepare(`
    INSERT INTO doctors (doctor_code, doctor_name, sort_order) VALUES (?, ?, ?)
    ON CONFLICT(doctor_code) DO UPDATE SET doctor_name = excluded.doctor_name
  `).run(code.toUpperCase(), name, nextOrder);

  res.status(201).json({ doctor: { code: code.toUpperCase(), name } });
});

// Admin drag-and-drop reordering in Check-in's Doctor Reference table.
// Body: { codes: ["JS", "BS", "SS", ...] } — full list in desired order.
router.patch('/reorder', requireAdmin, (req, res) => {
  const { codes } = req.body || {};
  if (!Array.isArray(codes) || codes.length === 0) {
    return res.status(400).json({ error: 'codes must be a non-empty array of doctor codes' });
  }

  const db = getDb();
  const setOrder = db.prepare('UPDATE doctors SET sort_order = ? WHERE doctor_code = ?');
  db.transaction(() => {
    codes.forEach((code, i) => setOrder.run(i + 1, code));
  })();

  const doctors = db.prepare('SELECT doctor_code, doctor_name, active FROM doctors ORDER BY sort_order, doctor_code').all();
  res.json({ doctors: doctors.map(d => ({ code: d.doctor_code, name: d.doctor_name, active: !!d.active })) });
});

// Admin toggle for hiding a doctor from Display Screen / Public Display
// and/or the Calling Screen — independent flags, both leave `active`
// untouched so the doctor keeps working at Check-in regardless. Must come
// after the /reorder route above, or Express would match "reorder" as
// :code here instead.
router.patch('/:code', requireAdmin, (req, res) => {
  const code = req.params.code.toUpperCase();
  const { displayHidden, callingHidden } = req.body || {};
  if (typeof displayHidden !== 'boolean' && typeof callingHidden !== 'boolean') {
    return res.status(400).json({ error: 'displayHidden and/or callingHidden (boolean) is required' });
  }

  const db = getDb();
  const updates = [];
  const params = { code };
  if (typeof displayHidden === 'boolean') { updates.push('display_hidden = @displayHidden'); params.displayHidden = displayHidden ? 1 : 0; }
  if (typeof callingHidden === 'boolean') { updates.push('calling_hidden = @callingHidden'); params.callingHidden = callingHidden ? 1 : 0; }

  const result = db.prepare(`UPDATE doctors SET ${updates.join(', ')} WHERE doctor_code = @code`).run(params);
  if (result.changes === 0) return res.status(404).json({ error: 'Doctor not found' });

  const doctor = db.prepare('SELECT doctor_code, doctor_name, active, display_hidden, calling_hidden FROM doctors WHERE doctor_code = ?').get(code);
  res.json({ doctor: { code: doctor.doctor_code, name: doctor.doctor_name, active: !!doctor.active, displayHidden: !!doctor.display_hidden, callingHidden: !!doctor.calling_hidden } });
});

router.delete('/:code', requireAdmin, (req, res) => {
  const code = req.params.code.toUpperCase();
  const db = getDb();
  
  db.transaction(() => {
    db.prepare('DELETE FROM doctors WHERE doctor_code = ?').run(code);
    db.prepare('DELETE FROM doc_states WHERE doctor_code = ?').run(code);
    db.prepare('DELETE FROM q_counters WHERE doctor_code = ?').run(code);
  })();
  
  res.json({ success: true, message: `Doctor ${code} removed successfully.` });
});

module.exports = router;
