import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

// Input sanitization functions
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // Remove null bytes and other dangerous characters
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize unicode to prevent unicode attacks
  sanitized = sanitized.normalize('NFKC');
  
  // Basic XSS protection using DOMPurify
  sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
};

export const sanitizeEmail = (email: string): string => {
  const sanitized = sanitizeString(email);
  return validator.normalizeEmail(sanitized) || sanitized;
};

export const sanitizeHtml = (html: string): string => {
  if (typeof html !== 'string') return '';
  
  // Allow only safe HTML tags and attributes
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class', 'id']
  });
};

// Recursive sanitization for objects
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
};

// Enhanced validation middleware with sanitization
export const validateBody = (schema: ZodSchema, options: { sanitize?: boolean } = { sanitize: true }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize input if enabled
      let body = req.body;
      if (options.sanitize) {
        body = sanitizeObject(body);
      }
      
      // Validate against schema
      const validated = schema.parse(body);
      req.body = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema, options: { sanitize?: boolean } = { sanitize: true }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize input if enabled
      let query = req.query;
      if (options.sanitize) {
        query = sanitizeObject(query);
      }
      
      // Validate against schema
      const validated = schema.parse(query);
      req.query = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema, options: { sanitize?: boolean } = { sanitize: true }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize input if enabled
      let params = req.params;
      if (options.sanitize) {
        params = sanitizeObject(params);
      }
      
      // Validate against schema
      const validated = schema.parse(params);
      req.params = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Parameter validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
};

// Additional security middleware
export const preventXSS = (req: Request, res: Response, next: NextFunction) => {
  // Set XSS protection headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Sanitize all string inputs
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Input size limiting middleware
export const limitInputSize = (maxSize: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const bodySize = JSON.stringify(req.body).length;
    
    if (bodySize > maxSize) {
      return res.status(413).json({
        success: false,
        error: 'Request payload too large',
        maxSize: maxSize
      });
    }
    
    next();
  };
};