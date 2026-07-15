import { api } from './api';

export interface Camp {
  id: number;
  camp_no: number;
  camp_date: string | null;
  public_token: string;
  active: number;
}

export interface LogEntry {
  id: number;
  gk: string;
  name: string;
  contact: string | null;
  doctor: string;
  doctorName: string | null;
  queue: string;
  type: 'new' | 'followup';
  status: 'waiting' | 'called' | 'completed';
  visits: number | null;
  time: string | null;
  priority: boolean;
  checkedInBy: string;
  campNo: number;
  fileStatus: string | null;
  fileMarkedBy: string | null;
}

export interface CallQueueEntry {
  id: number;
  docCode: string;
  name: string | null;
  gk: string | null;
  queue: string | null;
  time: string | null;
  status: 'sent' | 'ringing' | 'done';
  priority: boolean;
  campNo: number | null;
}

export interface Doctor {
  code: string;
  name: string;
  active: boolean;
  displayHidden: boolean;
  callingHidden: boolean;
}

export interface DashboardState {
  log: LogEntry[];
  docStates: Record<string, 'idle' | 'calling' | 'busy' | 'absent'>;
  callQueue: CallQueueEntry[];
  qCounters: Record<string, number>;
  doctors: Doctor[];
  activeCamp: { camp_no: number; camp_date: string | null } | null;
}

export interface Patient {
  gk: string;
  name: string;
  doctor?: string;
  doctorName?: string;
  contact?: string;
  expectedTime?: string;
  comment?: string;
  visits: number;
  priority: boolean;
  campNo?: number;
  lastEditedAt?: string;
}

export const DashboardService = {
  // Fetch single snapshot
  getState: async (): Promise<DashboardState> => {
    const res = await api.get<DashboardState>('/state');
    return res.data;
  },

  // Check-in Log Operations
  checkinPatient: async (entry: Partial<LogEntry>): Promise<{ entry: LogEntry }> => {
    const res = await api.post<{ entry: LogEntry }>('/log', entry);
    return res.data;
  },

  updateLogStatus: async (
    id: number,
    updates: { status?: 'waiting' | 'called' | 'completed'; fileStatus?: string | null }
  ): Promise<{ entry: LogEntry }> => {
    const res = await api.patch<{ entry: LogEntry }>(`/log/${id}`, updates);
    return res.data;
  },

  deleteLogEntry: async (id: number): Promise<void> => {
    await api.delete(`/log/${id}`);
  },

  // Doctor Operations
  getDoctorsList: async (): Promise<{ doctors: Doctor[] }> => {
    const res = await api.get<{ doctors: Doctor[] }>('/doctors');
    return res.data;
  },

  addDoctor: async (code: string, name: string): Promise<{ doctor: { code: string; name: string } }> => {
    const res = await api.post<{ doctor: { code: string; name: string } }>('/doctors', { code, name });
    return res.data;
  },

  deleteDoctor: async (code: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(`/doctors/${code}`);
    return res.data;
  },

  reorderDoctors: async (codes: string[]): Promise<{ doctors: Doctor[] }> => {
    const res = await api.patch<{ doctors: Doctor[] }>('/doctors/reorder', { codes });
    return res.data;
  },

  toggleDoctorHiddenFlags: async (
    code: string,
    flags: { displayHidden?: boolean; callingHidden?: boolean }
  ): Promise<{ doctor: Doctor }> => {
    const res = await api.patch<{ doctor: Doctor }>(`/doctors/${code}`, flags);
    return res.data;
  },

  updateDoctorState: async (
    code: string,
    state: 'idle' | 'calling' | 'busy' | 'absent'
  ): Promise<{ doctorCode: string; state: string }> => {
    const res = await api.patch<{ doctorCode: string; state: string }>(`/docstates/${code}`, { state });
    return res.data;
  },

  // Call Queue Operations
  dispatchCall: async (call: Partial<CallQueueEntry>): Promise<{ entry: CallQueueEntry }> => {
    const res = await api.post<{ entry: CallQueueEntry }>('/callqueue', call);
    return res.data;
  },

  updateCallStatus: async (id: number, status: 'sent' | 'ringing' | 'done'): Promise<{ entry: CallQueueEntry }> => {
    const res = await api.patch<{ entry: CallQueueEntry }>(`/callqueue/${id}`, { status });
    return res.data;
  },

  clearCallQueue: async (status?: string): Promise<void> => {
    await api.delete('/callqueue', { params: { status } });
  },

  // Patient Directory Operations
  getPatientByGk: async (gk: string): Promise<{ patient: Patient }> => {
    const res = await api.get<{ patient: Patient }>(`/patients/${gk}`);
    return res.data;
  },

  searchPatients: async (query: string): Promise<{ patients: Patient[] }> => {
    const res = await api.get<{ patients: Patient[] }>('/patients', { params: { q: query } });
    return res.data;
  },

  getAllPatients: async (): Promise<{ patients: Patient[] }> => {
    const res = await api.get<{ patients: Patient[] }>('/patients', { params: { all: '1' } });
    return res.data;
  },

  updatePatientDefaults: async (gk: string, updates: Partial<Patient>): Promise<{ patient: Patient }> => {
    const res = await api.patch<{ patient: Patient }>(`/patients/${gk}`, updates);
    return res.data;
  },

  // Camp Operations
  getCampsList: async (): Promise<{ camps: Camp[] }> => {
    const res = await api.get<{ camps: Camp[] }>('/camps');
    return res.data;
  },

  createCamp: async (campNo: number, campDate?: string): Promise<{ camp: Camp }> => {
    const res = await api.post<{ camp: Camp }>('/camps', { camp_no: campNo, camp_date: campDate });
    return res.data;
  },

  activateCampSession: async (campNo: number): Promise<{ camp: Camp }> => {
    const res = await api.post<{ camp: Camp }>(`/camps/${campNo}/activate`);
    return res.data;
  },

  deleteCamp: async (campNo: number): Promise<void> => {
    await api.delete(`/camps/${campNo}`);
  },

  importDoctorsExcel: async (campNo: number, file: File): Promise<{ imported: number; skipped: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ imported: number; skipped: number }>(`/camps/${campNo}/import/doctors`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  importPatientsExcel: async (
    campNo: number,
    file: File
  ): Promise<{ imported: number; skipped: number; unknownDoctorCodes: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ imported: number; skipped: number; unknownDoctorCodes: string[] }>(
      `/camps/${campNo}/import/patients`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },
};
