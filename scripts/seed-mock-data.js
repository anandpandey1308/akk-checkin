const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'akk_checkin.db');

function seedMockData() {
  console.log('Opening database at:', DB_PATH);
  const db = new Database(DB_PATH);

  try {
    db.transaction(() => {
      // 1. Ensure an active camp exists
      let activeCamp = db.prepare('SELECT * FROM camps WHERE active = 1').get();
      if (!activeCamp) {
        console.log('No active camp found. Seeding active camp #101...');
        const publicToken = 'token_' + Math.random().toString(36).substr(2, 9);
        db.prepare(
          'INSERT INTO camps (camp_no, camp_date, active, public_token) VALUES (?, ?, ?, ?)'
        ).run(101, new Date().toISOString().split('T')[0], 1, publicToken);
        activeCamp = db.prepare('SELECT * FROM camps WHERE active = 1').get();
      }
      const campNo = activeCamp.camp_no;
      console.log(`Using active Camp #${campNo}`);

      // 2. Clear old transactional queue data for this camp to avoid duplication
      db.prepare('DELETE FROM log_entries WHERE camp_no = ?').run(campNo);
      db.prepare('DELETE FROM call_queue WHERE camp_no = ?').run(campNo);
      db.prepare('DELETE FROM q_counters WHERE camp_no = ?').run(campNo);

      // 3. Seed Doctors
      console.log('Seeding mock doctors...');
      const mockDoctors = [
        { code: 'DR01', name: 'Dr. Ramesh Sharma', active: 1, sort_order: 1 },
        { code: 'DR02', name: 'Dr. Priya Patel', active: 1, sort_order: 2 },
        { code: 'DR03', name: 'Dr. Rajesh Mehta', active: 1, sort_order: 3 },
        { code: 'DR04', name: 'Dr. Sunita Rao', active: 1, sort_order: 4 },
      ];

      const upsertDoc = db.prepare(`
        INSERT INTO doctors (doctor_code, doctor_name, active, sort_order, display_hidden, calling_hidden)
        VALUES (?, ?, ?, ?, 0, 0)
        ON CONFLICT(doctor_code) DO UPDATE SET
          doctor_name = excluded.doctor_name,
          active = excluded.active,
          sort_order = excluded.sort_order
      `);

      const upsertDocState = db.prepare(`
        INSERT INTO doc_states (doctor_code, state)
        VALUES (?, 'idle')
        ON CONFLICT(doctor_code) DO NOTHING
      `);

      for (const doc of mockDoctors) {
        upsertDoc.run(doc.code, doc.name, doc.active, doc.sort_order);
        upsertDocState.run(doc.code);
      }

      // 4. Seed Patients Roster
      console.log('Seeding mock patient directory...');
      const mockPatients = [
        { gk: 'GK/1001', name: 'Aarav Patel', doctor_code: 'DR01', contact: '9876543210', visits: 1, priority: 1 },
        { gk: 'GK/1002', name: 'Divya Sharma', doctor_code: 'DR02', contact: '9876543211', visits: 0, priority: 0 },
        { gk: 'GK/1003', name: 'Rohan Verma', doctor_code: 'DR03', contact: '9876543212', visits: 3, priority: 0 },
        { gk: 'GK/1004', name: 'Aditi Iyer', doctor_code: 'DR04', contact: '9876543213', visits: 1, priority: 1 },
        { gk: 'GK/1005', name: 'Kabir Nair', doctor_code: 'DR01', contact: '9876543214', visits: 2, priority: 0 },
        { gk: 'GK/1006', name: 'Meera Joshi', doctor_code: 'DR02', contact: '9876543215', visits: 0, priority: 0 },
        { gk: 'GK/1007', name: 'Arjun Gupta', doctor_code: 'DR03', contact: '9876543216', visits: 1, priority: 0 },
        { gk: 'GK/1008', name: 'Neha Sen', doctor_code: 'DR04', contact: '9876543217', visits: 5, priority: 1 },
        { gk: 'GK/1009', name: 'Siddharth Roy', doctor_code: 'DR01', contact: '9876543218', visits: 0, priority: 0 },
        { gk: 'GK/1010', name: 'Pooja Reddy', doctor_code: 'DR02', contact: '9876543219', visits: 2, priority: 0 },
      ];

      const upsertPatient = db.prepare(`
        INSERT INTO patients (gk, name, doctor_code, contact, visits, priority, camp_no, last_edited_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(gk) DO UPDATE SET
          name = excluded.name,
          doctor_code = excluded.doctor_code,
          contact = excluded.contact,
          visits = excluded.visits,
          priority = excluded.priority,
          camp_no = excluded.camp_no,
          last_edited_at = excluded.last_edited_at
      `);

      for (const p of mockPatients) {
        upsertPatient.run(p.gk, p.name, p.doctor_code, p.contact, p.visits, p.priority, campNo);
      }

      // 5. Seed Log Entries (Today's Queue Log)
      console.log("Seeding today's check-in log queue...");
      const mockLogEntries = [
        { id: Date.now() - 100000, gk: 'GK/1001', name: 'Aarav Patel', doctor: 'DR01', docName: 'Dr. Ramesh Sharma', queue: 'DR01-1', type: 'followup', status: 'completed', file_status: 'found', priority: 1, visits: 1 },
        { id: Date.now() - 80000, gk: 'GK/1002', name: 'Divya Sharma', doctor: 'DR02', docName: 'Dr. Priya Patel', queue: 'DR02-1', type: 'new', status: 'called', file_status: 'transit', priority: 0, visits: 0 },
        { id: Date.now() - 60000, gk: 'GK/1003', name: 'Rohan Verma', doctor: 'DR03', docName: 'Dr. Rajesh Mehta', queue: 'DR03-1', type: 'followup', status: 'waiting', file_status: 'found', priority: 0, visits: 3 },
        { id: Date.now() - 40000, gk: 'GK/1004', name: 'Aditi Iyer', doctor: 'DR04', docName: 'Dr. Sunita Rao', queue: 'DR04-1', type: 'followup', status: 'waiting', file_status: null, priority: 1, visits: 1 },
        { id: Date.now() - 20000, gk: 'GK/1005', name: 'Kabir Nair', doctor: 'DR01', docName: 'Dr. Ramesh Sharma', queue: 'DR01-2', type: 'followup', status: 'waiting', file_status: 'missing', priority: 0, visits: 2 },
        { id: Date.now() - 10000, gk: 'GK/1006', name: 'Meera Joshi', doctor: 'DR02', docName: 'Dr. Priya Patel', queue: 'DR02-2', type: 'new', status: 'waiting', file_status: 'found', priority: 0, visits: 0 },
      ];

      const insertLog = db.prepare(`
        INSERT INTO log_entries (id, gk, name, doctor, doctor_name, queue, type, status, file_status, visits, priority, camp_no, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      for (const entry of mockLogEntries) {
        insertLog.run(
          entry.id,
          entry.gk,
          entry.name,
          entry.doctor,
          entry.docName,
          entry.queue,
          entry.type,
          entry.status,
          entry.file_status,
          entry.visits,
          entry.priority,
          campNo
        );
      }

      // 6. Set Doctor counters in q_counters
      console.log('Updating doctor queue counters...');
      const insertCounter = db.prepare(`
        INSERT INTO q_counters (doctor_code, camp_no, counter)
        VALUES (?, ?, ?)
      `);

      insertCounter.run('DR01', campNo, 2);
      insertCounter.run('DR02', campNo, 2);
      insertCounter.run('DR03', campNo, 1);
      insertCounter.run('DR04', campNo, 1);
    })();
    console.log('Success! Mock data seeded successfully.');
  } catch (error) {
    console.error('Error seeding mock data:', error);
  } finally {
    db.close();
  }
}

seedMockData();
