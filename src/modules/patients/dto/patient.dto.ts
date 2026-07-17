import { z } from 'zod';

export const UpdatePatientSchema = z.object({
  doctor: z.string().optional(),
  contact: z.string().optional(),
  comment: z.string().optional(),
  priority: z.boolean().optional(),
});

export type UpdatePatientDto = z.infer<typeof UpdatePatientSchema>;

export const BulkPrioritySchema = z.object({
  gks: z.array(z.union([z.string(), z.number()])).min(1, 'gks must be a non-empty array'),
});

export type BulkPriorityDto = z.infer<typeof BulkPrioritySchema>;

export interface PatientEntity {
  gk: string;
  name: string;
  doctor?: string;
  doctorName?: string;
  contact?: string;
  expectedTime?: string;
  comment?: string;
  visits: number;
  priority: boolean;
  campNo?: string;
  lastEditedAt?: string;
}
