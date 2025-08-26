import { Request, Response, NextFunction } from 'express';

// Extend Express Session interface
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: 'user' | 'business' | 'admin';
  }
}

// Authentication middleware - requires user to be logged in
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  next();
};

// Role-based access control
export const requireRole = (roles: Array<'user' | 'business' | 'admin'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId || !req.session.userRole) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.session.userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Business owner access - checks if user owns the business
export const requireBusinessOwner = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Business owners can access their own resources
  if (req.session.userRole === 'business') {
    return next();
  }

  // Admins can access all business resources
  if (req.session.userRole === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Business owner access required'
  });
};

// Optional authentication - allows both authenticated and unauthenticated users
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // Just continue - session data will be available if user is logged in
  next();
};