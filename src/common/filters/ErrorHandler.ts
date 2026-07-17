import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { AppError } from '../exceptions/AppError';
import { ApiResponse } from '../responses/ApiResponse';

export const ErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn({ err, path: req.path }, err.message);
    return res.status(err.statusCode).json(
      ApiResponse.error(err.message, { errorCode: err.errorCode })
    );
  }

  // Unhandled internal errors
  logger.error({ err, path: req.path }, 'Unhandled Internal Server Error');
  
  // Do not leak stack traces in production
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return res.status(500).json(
    ApiResponse.error(message, { errorCode: 'INTERNAL_ERROR' })
  );
};
