import { Router } from 'express';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { PatientRepository } from './patient.repository';

// We import this directly since it's commonJS right now
const { getDb } = require('../../database');
const { requireAuth } = require('../../middleware/auth');

export const PatientRouter = Router();

// 1. Dependency Injection setup
const repository = new PatientRepository(getDb());
const service = new PatientService(repository);
const controller = new PatientController(service);

// 2. Wire up routes
PatientRouter.post('/bulk-priority', requireAuth, controller.bulkPriority);
PatientRouter.patch('/:gk', requireAuth, controller.updatePatient);
PatientRouter.get('/:gk', requireAuth, controller.getPatient);
PatientRouter.get('/', requireAuth, controller.listPatients);
