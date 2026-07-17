import { Database } from 'better-sqlite3';
import { PatientEntity } from './dto/patient.dto';

export class PatientRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private readonly SELECT_WITH_DOCTOR = `
    SELECT p.*, d.doctor_name 
    FROM patients p 
    LEFT JOIN doctors d ON d.doctor_code = p.doctor_code
  `;

  private mapRow(r: any): PatientEntity | null {
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

  findByGk(gk: string): PatientEntity | null {
    const row = this.db.prepare(`${this.SELECT_WITH_DOCTOR} WHERE p.gk = ?`).get(gk);
    return this.mapRow(row);
  }

  findAll(limit: number = 3000): PatientEntity[] {
    const rows = this.db.prepare(`${this.SELECT_WITH_DOCTOR} ORDER BY p.gk LIMIT ?`).all(limit) as any[];
    return rows.map(r => this.mapRow(r)!);
  }

  search(qUpper: string, exactGk: string | null, like: string, numLike: string | null): PatientEntity[] {
    const rows = this.db.prepare(`
      ${this.SELECT_WITH_DOCTOR}
      WHERE p.gk LIKE @like OR p.name LIKE @like OR p.gk LIKE @numLike
      ORDER BY CASE WHEN p.gk = @qUpper OR p.gk = @exactGk THEN 0 ELSE 1 END, p.gk
      LIMIT 30
    `).all({ like, numLike, qUpper, exactGk }) as any[];
    return rows.map(r => this.mapRow(r)!);
  }

  exists(gk: string): boolean {
    const row = this.db.prepare('SELECT gk FROM patients WHERE gk = ?').get(gk);
    return !!row;
  }

  updateFields(gk: string, updates: string[], params: any): void {
    const stmt = `UPDATE patients SET ${updates.join(', ')} WHERE gk = @gk`;
    this.db.prepare(stmt).run(params);
  }

  syncPendingLogEntryPriority(gk: string, priority: boolean): void {
    this.db.prepare(`UPDATE log_entries SET priority = ? WHERE gk = ? AND status IN ('waiting','called')`)
      .run(priority ? 1 : 0, gk);
  }

  executeTransaction(fn: () => void): void {
    this.db.transaction(fn)();
  }

  markPriority(gk: string): boolean {
    const result = this.db.prepare('UPDATE patients SET priority = 1 WHERE gk = ?').run(gk);
    return result.changes > 0;
  }
}
