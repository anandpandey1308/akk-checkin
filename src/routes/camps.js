const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const { getDb } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const camps = db.prepare('SELECT * FROM camps ORDER BY camp_no DESC').all();
  res.json({ camps });
});

router.post('/', requireAdmin, (req, res) => {
  const { camp_no, camp_date } = req.body || {};
  if (!camp_no) return res.status(400).json({ error: 'camp_no is required' });

  const db = getDb();
  if (db.prepare('SELECT id FROM camps WHERE camp_no = ?').get(camp_no)) {
    return res.status(409).json({ error: `Camp ${camp_no} already exists` });
  }
  db.prepare('INSERT INTO camps (camp_no, camp_date, public_token) VALUES (?, ?, ?)')
    .run(camp_no, camp_date || null, crypto.randomUUID());
  res.status(201).json({ camp: db.prepare('SELECT * FROM camps WHERE camp_no = ?').get(camp_no) });
});

// Downloads a camp's full data as .xlsx — meant to be used right before
// deleting a camp, since deletion is permanent and cascades the check-in log
// and patient roster. Check-in log includes both the doctor a patient was
// checked in under at the time (frozen on the log row) and that patient's
// current doctor per the master record, since Update Database edits (e.g. a
// name/doctor correction made after check-in) never rewrite historical log
// rows — this way a later correction is visible without losing the original.
router.get('/:campNo/export', requireAdmin, async (req, res) => {
  const campNo = Number(req.params.campNo);
  const db = getDb();
  const camp = db.prepare('SELECT * FROM camps WHERE camp_no = ?').get(campNo);
  if (!camp) return res.status(404).json({ error: 'Camp not found' });

  const logRows = db.prepare('SELECT * FROM log_entries WHERE camp_no = ? ORDER BY id ASC').all(campNo);
  const patientRows = db.prepare('SELECT * FROM patients WHERE camp_no = ? ORDER BY gk ASC').all(campNo);
  const doctorNames = new Map(db.prepare('SELECT doctor_code, doctor_name FROM doctors').all().map(d => [d.doctor_code, d.doctor_name]));
  doctorNames.set('NW', 'New Patient');
  const currentPatientDoctor = new Map(db.prepare('SELECT gk, doctor_code FROM patients').all().map(p => [p.gk, p.doctor_code]));

  const workbook = new ExcelJS.Workbook();

  const logSheet = workbook.addWorksheet('Check-in Log');
  logSheet.columns = [
    { header: 'Time', key: 'time', width: 10 },
    { header: 'GK Number', key: 'gk', width: 12 },
    { header: 'Patient Name', key: 'name', width: 22 },
    { header: 'Queue', key: 'queue', width: 10 },
    { header: 'Doctor Code (at check-in)', key: 'doctorAtCheckin', width: 20 },
    { header: 'Doctor Name (at check-in)', key: 'doctorNameAtCheckin', width: 24 },
    { header: 'Doctor Code (current)', key: 'doctorCurrent', width: 18 },
    { header: 'Doctor Name (current)', key: 'doctorNameCurrent', width: 24 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'File Status', key: 'fileStatus', width: 12 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Priority', key: 'priority', width: 8 },
    { header: 'Visits', key: 'visits', width: 8 },
    { header: 'Checked In By', key: 'checkedInBy', width: 16 },
  ];
  logRows.forEach(r => {
    const currentCode = currentPatientDoctor.get(r.gk) || r.doctor;
    logSheet.addRow({
      time: r.time || '',
      gk: r.gk,
      name: r.name,
      queue: r.queue,
      doctorAtCheckin: r.doctor,
      doctorNameAtCheckin: r.doctor_name || doctorNames.get(r.doctor) || '',
      doctorCurrent: currentCode || '',
      doctorNameCurrent: doctorNames.get(currentCode) || '',
      status: r.status,
      fileStatus: r.file_status || '',
      type: r.type,
      priority: r.priority ? 'Y' : 'N',
      visits: r.visits ?? '',
      checkedInBy: r.checked_in_by || '',
    });
  });

  const patientSheet = workbook.addWorksheet('Patient Roster');
  patientSheet.columns = [
    { header: 'GK Number', key: 'gk', width: 12 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Doctor Code', key: 'doctorCode', width: 14 },
    { header: 'Doctor Name', key: 'doctorName', width: 24 },
    { header: 'Expected Time', key: 'expectedTime', width: 16 },
    { header: 'Contact', key: 'contact', width: 18 },
    { header: 'Comment', key: 'comment', width: 24 },
    { header: 'Visits', key: 'visits', width: 8 },
    { header: 'Priority', key: 'priority', width: 8 },
  ];
  patientRows.forEach(p => {
    patientSheet.addRow({
      gk: p.gk,
      name: p.name,
      doctorCode: p.doctor_code || '',
      doctorName: doctorNames.get(p.doctor_code) || '',
      expectedTime: p.expected_time || '',
      contact: p.contact || '',
      comment: p.comment || '',
      visits: p.visits,
      priority: p.priority ? 'Y' : 'N',
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="camp-${campNo}-export.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

// Removes a camp once it's over — admin can delete regardless of whether it's
// currently active or has check-in history; deleting the active camp just
// leaves no camp active until another is activated. Cascades to the patient
// roster and check-in log for that camp_no so nothing orphaned resurfaces if
// the same camp_no is ever reused.
router.delete('/:campNo', requireAdmin, (req, res) => {
  const campNo = Number(req.params.campNo);
  const db = getDb();
  const camp = db.prepare('SELECT * FROM camps WHERE camp_no = ?').get(campNo);
  if (!camp) return res.status(404).json({ error: 'Camp not found' });

  db.transaction(() => {
    db.prepare('DELETE FROM log_entries WHERE camp_no = ?').run(campNo);
    db.prepare('DELETE FROM patients WHERE camp_no = ?').run(campNo);
    db.prepare('DELETE FROM q_counters WHERE camp_no = ?').run(campNo);
    db.prepare('DELETE FROM call_queue WHERE camp_no = ?').run(campNo);
    db.prepare('DELETE FROM camps WHERE camp_no = ?').run(campNo);
  })();

  res.json({ message: 'Deleted' });
});

// Only one active camp at a time — activating one deactivates the rest.
// Also resets every doctor to "idle": doc_states isn't camp-scoped (it's a
// flat doctor_code -> state map), so without this a doctor who was "busy"
// when the last camp wrapped up would still show busy on a brand new camp
// day. Idle (not absent) so the board starts as if every doctor is present
// and ready — staff flip a doctor to Absent themselves if they haven't
// arrived yet.
// q_counters needs no such reset — it's keyed by (doctor_code, camp_no), so
// a newly activated camp naturally has no rows yet (numbering starts at 1)
// and a reactivated camp picks up exactly where its own history left off.
router.post('/:campNo/activate', requireAdmin, (req, res) => {
  const campNo = Number(req.params.campNo);
  const db = getDb();
  const camp = db.prepare('SELECT * FROM camps WHERE camp_no = ?').get(campNo);
  if (!camp) return res.status(404).json({ error: 'Camp not found' });

  db.transaction(() => {
    db.prepare('UPDATE camps SET active = 0').run();
    db.prepare('UPDATE camps SET active = 1 WHERE camp_no = ?').run(campNo);
    const setIdle = db.prepare(`
      INSERT INTO doc_states (doctor_code, state) VALUES (?, 'idle')
      ON CONFLICT(doctor_code) DO UPDATE SET state = 'idle'
    `);
    for (const { doctor_code } of db.prepare('SELECT doctor_code FROM doctors').all()) {
      setIdle.run(doctor_code);
    }
    // NW (New Patient / walk-in intake) isn't a row in the doctors table —
    // it's a frontend-only concept — so the loop above never reaches it.
    // Seed it explicitly: always idle at camp start, same as every doctor.
    setIdle.run('NW');
  })();

  res.json({ camp: db.prepare('SELECT * FROM camps WHERE camp_no = ?').get(campNo) });
});

// ── Excel helpers ──
// Reads the header row (row 1) into a { lowercasedHeader: columnIndex } map,
// so column order in the sheet doesn't matter.
function readHeaderMap(worksheet) {
  const map = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const key = String(cell.value || '').trim().toLowerCase();
    if (key) map[key] = colNumber;
  });
  return map;
}

function cellText(row, colNumber) {
  if (!colNumber) return '';
  const v = row.getCell(colNumber).value;
  if (v == null) return '';
  if (typeof v === 'object' && v.text) return String(v.text).trim(); // rich text / hyperlink cells
  return String(v).trim();
}

// doctors.xlsx — columns: "Doctor Name", "Doctor Code"
router.post('/:campNo/import/doctors', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required (multipart field "file")' });

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ error: 'No sheet found in the uploaded file' });

    const cols = readHeaderMap(sheet);
    const nameCol = cols['doctor name'];
    const codeCol = cols['doctor code'];
    if (!nameCol || !codeCol) {
      return res.status(400).json({ error: 'Header row must include "Doctor Name" and "Doctor Code" columns' });
    }

    const db = getDb();
    // New doctors are appended after whatever's already there, in upload row
    // order — existing doctors keep whatever position admin has drag-dropped
    // them to (re-uploading only refreshes the name, never sort_order).
    const insert = db.prepare(`
      INSERT INTO doctors (doctor_code, doctor_name, sort_order) VALUES (@code, @name, @sortOrder)
      ON CONFLICT(doctor_code) DO UPDATE SET doctor_name = excluded.doctor_name
    `);

    let imported = 0, skipped = 0;
    db.transaction(() => {
      let nextOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) m FROM doctors').get().m) + 1;
      for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const name = cellText(row, nameCol);
        const code = cellText(row, codeCol).toUpperCase();
        if (!name || !code) { skipped++; continue; }
        insert.run({ code, name, sortOrder: nextOrder });
        nextOrder++;
        imported++;
      }
    })();

    res.json({ imported, skipped });
  } catch (e) {
    res.status(400).json({ error: `Couldn't parse the Excel file: ${e.message}` });
  }
});

// patients.xlsx — columns: "GK Number", "Name", "Doctor" (doctor code),
// "Time of Expected Arrival" (optional), "Phone 1"/"Phone 2" (optional, not
// shown in the UI yet — captured for future use).
router.post('/:campNo/import/patients', requireAdmin, upload.single('file'), async (req, res) => {
  const campNo = Number(req.params.campNo);
  if (!req.file) return res.status(400).json({ error: 'file is required (multipart field "file")' });

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ error: 'No sheet found in the uploaded file' });

    const cols = readHeaderMap(sheet);
    const gkCol = cols['gk number'] || cols['gk'];
    const nameCol = cols['name'];
    const doctorCol = cols['doctor'];
    const timeCol = cols['time of expected arrival'] || cols['expected arrival'] || cols['expected time'];
    const phone1Col = cols['phone 1'] || cols['phone1'];
    const phone2Col = cols['phone 2'] || cols['phone2'];
    const priorityCol = cols['priority'];
    if (!gkCol || !nameCol || !doctorCol) {
      return res.status(400).json({ error: 'Header row must include "GK Number", "Name", and "Doctor" columns' });
    }

    const db = getDb();
    const knownDoctors = new Set(db.prepare('SELECT doctor_code FROM doctors').all().map(r => r.doctor_code));
    // contact is intentionally left out of ON CONFLICT's SET — re-uploading a
    // roster must never clobber a mobile number staff already hand-entered
    // via Update Database. Phone 1/2 from the sheet only ever land on a
    // brand-new patient row (the INSERT branch). priority is add-only for the
    // same reason: "Y" upgrades a patient to priority, but "N"/blank on a
    // re-upload never downgrades someone already marked priority elsewhere
    // (Update Database, the bulk paste-list, or a prior upload).
    const upsert = db.prepare(`
      INSERT INTO patients (gk, name, doctor_code, expected_time, contact, priority, camp_no)
      VALUES (@gk, @name, @doctorCode, @expectedTime, @contact, @priority, @campNo)
      ON CONFLICT(gk) DO UPDATE SET
        name = excluded.name,
        doctor_code = excluded.doctor_code,
        expected_time = excluded.expected_time,
        camp_no = excluded.camp_no,
        priority = CASE WHEN excluded.priority = 1 THEN 1 ELSE priority END
    `);

    let imported = 0, skipped = 0;
    const unknownDoctorCodes = new Set();
    db.transaction(() => {
      for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        let gk = cellText(row, gkCol);
        const name = cellText(row, nameCol);
        const doctorCode = cellText(row, doctorCol).toUpperCase();
        const expectedTime = timeCol ? cellText(row, timeCol) : '';
        const phone1 = phone1Col ? cellText(row, phone1Col) : '';
        const phone2 = phone2Col ? cellText(row, phone2Col) : '';
        const contact = [phone1, phone2].filter(Boolean).join(' / ');
        const priority = priorityCol && cellText(row, priorityCol).trim().toUpperCase() === 'Y' ? 1 : 0;
        if (!gk || !name) { skipped++; continue; }
        if (!gk.toUpperCase().startsWith('GK/')) gk = `GK/${gk.replace(/[^0-9]/g, '')}`;
        if (doctorCode && !knownDoctors.has(doctorCode)) { unknownDoctorCodes.add(doctorCode); skipped++; continue; }
        upsert.run({ gk, name, doctorCode: doctorCode || null, expectedTime: expectedTime || null, contact: contact || null, priority, campNo });
        imported++;
      }
    })();

    res.json({ imported, skipped, unknownDoctorCodes: [...unknownDoctorCodes] });
  } catch (e) {
    res.status(400).json({ error: `Couldn't parse the Excel file: ${e.message}` });
  }
});

module.exports = router;
