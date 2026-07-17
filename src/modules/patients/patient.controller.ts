import { Request, Response } from 'express';
import { PatientService } from './patient.service';
import { UpdatePatientSchema, BulkPrioritySchema } from './dto/patient.dto';
import { ApiResponse } from '../../common/responses/ApiResponse';

export class PatientController {
  private service: PatientService;

  constructor(service: PatientService) {
    this.service = service;
  }

  getPatient = (req: Request, res: Response) => {
    const gk = req.params.gk as string;
    const patient = this.service.getPatientByGk(gk);
    res.json(ApiResponse.success({ patient }));
  }

  listPatients = (req: Request, res: Response) => {
    const isAll = req.query.all === '1';
    const q = req.query.q as string || '';
    
    const patients = this.service.listOrSearchPatients(q, isAll);
    res.json(ApiResponse.success({ patients }));
  }

  updatePatient = (req: Request, res: Response) => {
    const gk = req.params.gk as string;
    
    // Zod validation
    const parsedData = UpdatePatientSchema.parse(req.body);
    
    const patient = this.service.updatePatient(gk, parsedData);
    res.json(ApiResponse.success({ patient }));
  }

  bulkPriority = (req: Request, res: Response) => {
    // Zod validation
    const parsedData = BulkPrioritySchema.parse(req.body);

    const result = this.service.bulkUpdatePriority(parsedData);
    res.json(ApiResponse.success(result));
  }
}
