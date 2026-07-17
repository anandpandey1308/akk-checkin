import { PatientRepository } from './patient.repository';
import { UpdatePatientDto, BulkPriorityDto, PatientEntity } from './dto/patient.dto';
import { NotFoundError, ValidationError } from '../../common/exceptions/AppError';

export class PatientService {
  private repository: PatientRepository;

  constructor(repository: PatientRepository) {
    this.repository = repository;
  }

  getPatientByGk(gk: string): PatientEntity {
    const formattedGk = gk.toUpperCase();
    const patient = this.repository.findByGk(formattedGk);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }
    return patient;
  }

  listOrSearchPatients(query: string, all: boolean): PatientEntity[] {
    if (all) {
      return this.repository.findAll();
    }

    const q = query.trim();
    if (q.length < 1) return [];

    const numOnly = q.replace(/[^0-9]/g, '');
    const qUpper = q.toUpperCase();
    const exactGk = numOnly ? `GK/${numOnly}` : null;
    const like = `%${q}%`;
    const numLike = numOnly ? `%${numOnly}%` : null;

    return this.repository.search(qUpper, exactGk, like, numLike);
  }

  updatePatient(gkParam: string, data: UpdatePatientDto): PatientEntity {
    const gk = gkParam.toUpperCase();
    
    if (!this.repository.exists(gk)) {
      throw new NotFoundError('Patient not found');
    }

    const updates: string[] = [];
    const params: any = { gk };

    if (data.doctor !== undefined) { 
      updates.push('doctor_code = @doctor'); 
      params.doctor = data.doctor || null; 
    }
    if (data.contact !== undefined) { 
      updates.push('contact = @contact'); 
      params.contact = data.contact || null; 
    }
    if (data.comment !== undefined) { 
      updates.push('comment = @comment'); 
      params.comment = data.comment || null; 
    }
    if (data.priority !== undefined) { 
      updates.push('priority = @priority'); 
      params.priority = data.priority ? 1 : 0; 
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push("last_edited_at = @lastEditedAt");
    params.lastEditedAt = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    this.repository.executeTransaction(() => {
      this.repository.updateFields(gk, updates, params);
      
      if (data.priority !== undefined) {
        this.repository.syncPendingLogEntryPriority(gk, data.priority);
      }
    });

    return this.repository.findByGk(gk)!;
  }

  bulkUpdatePriority(data: BulkPriorityDto): { marked: string[], notFound: string[] } {
    const marked: string[] = [];
    const notFound: string[] = [];

    this.repository.executeTransaction(() => {
      for (const raw of data.gks) {
        let gk = String(raw).trim().toUpperCase();
        if (!gk) continue;
        if (!gk.startsWith('GK/')) {
          gk = `GK/${gk.replace(/[^0-9]/g, '')}`;
        }

        const isUpdated = this.repository.markPriority(gk);
        if (isUpdated) {
          marked.push(gk);
          this.repository.syncPendingLogEntryPriority(gk, true);
        } else {
          notFound.push(gk);
        }
      }
    });

    return { marked, notFound };
  }
}
