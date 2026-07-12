const express = require('express');
const { getDb } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function rowToPatient(r) {
  if (!r) return null;
  return {
    gk: r.gk,
    name: r.name,
    doctor: r.doctor_code || undefined,
    doctorName: r.doctor_name || undefined,
    contact: r.contact || undefined,
    expectedTime: r.expected_time || undefined,
    comment: r.comment || undefined,
    visits: r.visits,
    priority: !!r.priority,
    campNo: r.camp_no || undefined,
    lastEditedAt: r.last_edited_at || undefined,
  };
}

const SELECT_WITH_DOCTOR = `
  SELECT p.*, d.doctor_name FROM patients p LEFT JOIN doctors d ON d.doctor_code = p.doctor_code
`;

// Exact lookup by GK number — used by the check-in scanner.
router.get('/:gk', requireAuth, (req, res) => {
  const gk = req.params.gk.toUpperCase();
  const db = getDb();
  const row = db.prepare(`${SELECT_WITH_DOCTOR} WHERE p.gk = ?`).get(gk);
  if (!row) return res.status(404).json({ error: 'Patient not found' });
  res.json({ patient: rowToPatient(row) });
});

// Prefix/substring search — used by Update Database and global search.
// ?all=1 returns the full roster (bounded), for the Barcode Printer tab.
router.get('/', requireAuth, (req, res) => {
  const db = getDb();

  if (req.query.all === '1') {
    const rows = db.prepare(`${SELECT_WITH_DOCTOR} ORDER BY p.gk LIMIT 3000`).all();
    return res.json({ patients: rows.map(rowToPatient) });
  }

  const q = String(req.query.q || '').trim();
  if (q.length < 1) return res.json({ patients: [] });

  // GK number and name only — contact/phone is intentionally excluded, or
  // searching e.g. "40" turns up every patient whose mobile number happens
  // to contain "40" as a substring. An exact GK match (typed as "40" or
  // "GK/40") is sorted to the top instead of just falling wherever
  // alphabetical order puts it.
  const numOnly = q.replace(/[^0-9]/g, '');
  const qUpper = q.toUpperCase();
  const exactGk = numOnly ? `GK/${numOnly}` : null;
  const like = `%${q}%`;
  const numLike = numOnly ? `%${numOnly}%` : null;
  const rows = db.prepare(`
    ${SELECT_WITH_DOCTOR}
    WHERE p.gk LIKE @like OR p.name LIKE @like OR p.gk LIKE @numLike
    ORDER BY CASE WHEN p.gk = @qUpper OR p.gk = @exactGk THEN 0 ELSE 1 END, p.gk
    LIMIT 30
  `).all({ like, numLike, qUpper, exactGk });

  res.json({ patients: rows.map(rowToPatient) });
});

// Edit a patient's doctor/mobile/comment/priority — the Update Database tab.
router.patch('/:gk', requireAuth, (req, res) => {
  const gk = req.params.gk.toUpperCase();
  const db = getDb();
  if (!db.prepare('SELECT gk FROM patients WHERE gk = ?').get(gk)) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const { doctor, contact, comment, priority } = req.body || {};
  const updates = [];
  const params = { gk };
  if (doctor !== undefined) { updates.push('doctor_code = @doctor'); params.doctor = doctor || null; }
  if (contact !== undefined) { updates.push('contact = @contact'); params.contact = contact || null; }
  if (comment !== undefined) { updates.push('comment = @comment'); params.comment = comment || null; }
  if (priority !== undefined) { updates.push('priority = @priority'); params.priority = priority ? 1 : 0; }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  updates.push("last_edited_at = @lastEditedAt");
  params.lastEditedAt = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  db.transaction(() => {
    db.prepare(`UPDATE patients SET ${updates.join(', ')} WHERE gk = @gk`).run(params);
    // Priority is snapshotted onto log_entries at check-in time, so editing
    // it here after the patient's already checked in today silently didn't
    // show up anywhere live (Check-in log, Calling Screen). Push it forward
    // onto any still-pending entry for them today.
    if (priority !== undefined) {
      db.prepare(`UPDATE log_entries SET priority = ? WHERE gk = ? AND status IN ('waiting','called')`)
        .run(priority ? 1 : 0, gk);
    }
  })();

  const row = db.prepare(`${SELECT_WITH_DOCTOR} WHERE p.gk = ?`).get(gk);
  res.json({ patient: rowToPatient(row) });
});

// Bulk-mark a pasted list of GK numbers as priority — add-only, never
// un-marks anyone not in the list (that's what the per-patient toggle is
// for). Used by Update Database's "paste a list" bulk priority box.
router.post('/bulk-priority', requireAuth, (req, res) => {
  const { gks } = req.body || {};
  if (!Array.isArray(gks) || gks.length === 0) {
    return res.status(400).json({ error: 'gks must be a non-empty array' });
  }

  const db = getDb();
  const setPriority = db.prepare('UPDATE patients SET priority = 1 WHERE gk = ?');
  // Same forward-sync as the PATCH route above — a patient already checked
  // in today needs their pending log entry updated too, not just the master
  // record, or the priority never shows up in Check-in / Calling Screen.
  const syncLogEntry = db.prepare(`UPDATE log_entries SET priority = 1 WHERE gk = ? AND status IN ('waiting','called')`);
  const marked = [];
  const notFound = [];

  db.transaction(() => {
    for (const raw of gks) {
      let gk = String(raw).trim().toUpperCase();
      if (!gk) continue;
      if (!gk.startsWith('GK/')) gk = `GK/${gk.replace(/[^0-9]/g, '')}`;
      const result = setPriority.run(gk);
      if (result.changes > 0) { marked.push(gk); syncLogEntry.run(gk); }
      else notFound.push(gk);
    }
  })();

  res.json({ marked, notFound });
});

module.exports = router;
