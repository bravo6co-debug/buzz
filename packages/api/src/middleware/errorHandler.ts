import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface APIError extends Error {
  statusCode?: number;
  details?: any;
}

export const errorHandler = (
  err: APIError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // Zod validation error
  if (err instanceof ZodError) {
    const message = 'Validation Error';
    error = {
      ...error,
      statusCode: 400,
      message,
      details: err.errors
    };
  }

  // Duplicate key error (PostgreSQL)
  if (err.message.includes('duplicate key value')) {
    const message = 'Duplicate resource';
    error = {
      ...error,
      statusCode: 400,
      message
    };
  }

  // Cast error
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      ...error,
      statusCode: 404,
      message
    };
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    ...(error.details && { details: error.details })
  });
};