import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Handle known AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  }
  // Handle validation errors (from Joi or similar)
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
    isOperational = true;
  }
  // Handle JSON parsing errors
  else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = 'Invalid JSON in request body';
    isOperational = true;
  }
  // Handle other known error types
  else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    isOperational = true;
  }

  // Log error details
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  console[logLevel]('API Error:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    statusCode,
    message: error.message,
    stack: error.stack,
    body: req.body,
    query: req.query,
    params: req.params,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't expose internal error details in production
  if (!isOperational && process.env.NODE_ENV === 'production') {
    message = 'Something went wrong';
  }

  const response: ApiResponse = {
    success: false,
    error: message,
    timestamp: new Date()
  };

  // Add additional error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error = error.message;
    (response as any).stack = error.stack;
    (response as any).statusCode = statusCode;
  }

  res.status(statusCode).json(response);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Common error creators
export const createValidationError = (message: string) => new AppError(message, 400);
export const createNotFoundError = (resource: string = 'Resource') => new AppError(`${resource} not found`, 404);
export const createUnauthorizedError = (message: string = 'Unauthorized') => new AppError(message, 401);
export const createForbiddenError = (message: string = 'Forbidden') => new AppError(message, 403);
export const createConflictError = (message: string) => new AppError(message, 409);
export const createTooManyRequestsError = (message: string = 'Too many requests') => new AppError(message, 429);