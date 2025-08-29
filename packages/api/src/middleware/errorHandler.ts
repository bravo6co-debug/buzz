import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { log } from '@buzz/shared/logger';

export interface APIError extends Error {
  statusCode?: number;
  details?: any;
  code?: string;
  isOperational?: boolean;
}

// Create error instance with consistent structure
export const createError = (
  message: string, 
  statusCode: number = 500, 
  code?: string, 
  details?: any
): APIError => {
  const error = new Error(message) as APIError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  error.isOperational = true;
  return error;
};

// Sanitize error messages to prevent information disclosure
const sanitizeErrorMessage = (message: string, statusCode: number): string => {
  // List of sensitive patterns that should be replaced
  const sensitivePatterns = [
    /password/gi,
    /secret/gi,
    /key/gi,
    /token/gi,
    /api_key/gi,
    /database/gi,
    /connection/gi,
    /postgresql:\/\//gi,
    /mysql:\/\//gi,
    /mongodb:\/\//gi,
    /@[\w.-]+/gi, // email addresses
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/gi, // IP addresses
    /localhost/gi,
    /127\.0\.0\.1/gi,
  ];

  let sanitized = message;
  
  // Replace sensitive information
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  // Generic messages for server errors to prevent information disclosure
  if (statusCode >= 500) {
    return 'Internal server error occurred. Please try again later.';
  }

  return sanitized;
};

// Enhanced error logging
const logError = (err: APIError, req: Request) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req.session as any)?.userId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      code: err.code,
      details: err.details
    }
  };

  if (err.statusCode && err.statusCode < 500) {
    log.warn('Client error occurred', errorInfo);
  } else {
    log.error('Server error occurred', errorInfo);
  }
};

export const errorHandler = (
  err: APIError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with context
  logError(err, req);

  let statusCode = 500;
  let message = 'Internal server error occurred';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  // Zod validation error
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: sanitizeErrorMessage(e.message, 400),
      code: e.code
    }));
  }
  // PostgreSQL specific errors
  else if (err.message.includes('duplicate key value')) {
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_RESOURCE';
  }
  else if (err.message.includes('violates foreign key constraint')) {
    statusCode = 400;
    message = 'Invalid reference to related resource';
    code = 'FOREIGN_KEY_VIOLATION';
  }
  else if (err.message.includes('violates not-null constraint')) {
    statusCode = 400;
    message = 'Required field is missing';
    code = 'MISSING_REQUIRED_FIELD';
  }
  else if (err.message.includes('violates check constraint')) {
    statusCode = 400;
    message = 'Invalid data format or value';
    code = 'CONSTRAINT_VIOLATION';
  }
  // Authentication/Authorization errors
  else if (err.message.includes('Authentication required') || err.message.includes('Unauthorized')) {
    statusCode = 401;
    message = 'Authentication required';
    code = 'AUTHENTICATION_REQUIRED';
  }
  else if (err.message.includes('Insufficient permissions') || err.message.includes('Forbidden')) {
    statusCode = 403;
    message = 'Insufficient permissions';
    code = 'INSUFFICIENT_PERMISSIONS';
  }
  // Cast/Not found errors
  else if (err.name === 'CastError' || err.message.includes('not found')) {
    statusCode = 404;
    message = 'Resource not found';
    code = 'RESOURCE_NOT_FOUND';
  }
  // Rate limiting errors
  else if (err.message.includes('Too many requests')) {
    statusCode = 429;
    message = 'Too many requests. Please try again later.';
    code = 'RATE_LIMIT_EXCEEDED';
  }
  // CSRF errors
  else if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    message = 'Invalid security token. Please refresh and try again.';
    code = 'INVALID_CSRF_TOKEN';
  }
  // Custom operational errors
  else if (error.isOperational && error.statusCode) {
    statusCode = error.statusCode;
    message = sanitizeErrorMessage(error.message, statusCode);
    code = error.code || 'OPERATIONAL_ERROR';
    details = error.details;
  }
  // Default server error
  else {
    statusCode = 500;
    message = 'Internal server error occurred. Please try again later.';
    code = 'INTERNAL_ERROR';
  }

  // Generate error ID for tracking
  const errorId = require('crypto').randomUUID();

  // Standard error response format
  const errorResponse = {
    success: false,
    error: {
      message,
      code,
      id: errorId,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  };

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  res.status(statusCode).json(errorResponse);
};