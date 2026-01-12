/**
 * Global error handling middleware
 * Catches all errors and returns consistent JSON responses
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError, isOperationalError } from '../utils/errors';
import logger from '../utils/logger';

interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Record<string, any>;
        stack?: string;
    };
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 Not Found handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    const response: ErrorResponse = {
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        }
    };
    res.status(404).json(response);
};

/**
 * Global error handler middleware
 * Must be registered last after all routes
 */
export const errorHandler: ErrorRequestHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log the error
    const isOperational = isOperationalError(err);
    const logLevel = isOperational ? 'warn' : 'error';
    
    logger[logLevel]('Error handled', {
        error: err.message,
        code: err instanceof AppError ? err.code : 'UNKNOWN',
        statusCode: err instanceof AppError ? err.statusCode : 500,
        path: req.path,
        method: req.method,
        isOperational,
        stack: isOperational ? undefined : err.stack,
    });

    // Handle AppError instances
    if (err instanceof AppError) {
        const response: ErrorResponse = {
            error: {
                code: err.code,
                message: err.message,
                ...(err.details && { details: err.details }),
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
            }
        };
        
        // Set retry-after header for rate limit errors
        if (err.statusCode === 429 && (err as any).retryAfter) {
            res.setHeader('Retry-After', (err as any).retryAfter);
        }
        
        return res.status(err.statusCode).json(response);
    }

    // Handle Multer errors (file upload)
    if (err.name === 'MulterError') {
        const multerErr = err as any;
        let message = 'File upload error';
        let code = 'UPLOAD_ERROR';
        
        switch (multerErr.code) {
            case 'LIMIT_FILE_SIZE':
                message = 'File size exceeds the maximum limit (10MB)';
                code = 'FILE_TOO_LARGE';
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files uploaded';
                code = 'TOO_MANY_FILES';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected field in file upload';
                code = 'UNEXPECTED_FIELD';
                break;
        }
        
        return res.status(400).json({
            error: { code, message }
        });
    }

    // Handle JSON parse errors
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            error: {
                code: 'INVALID_JSON',
                message: 'Invalid JSON in request body',
            }
        });
    }

    // Handle unknown errors (potential bugs)
    const response: ErrorResponse = {
        error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production' 
                ? 'An unexpected error occurred' 
                : err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        }
    };
    
    res.status(500).json(response);
};

/**
 * Unhandled rejection handler for process-level errors
 */
export const setupProcessErrorHandlers = () => {
    process.on('unhandledRejection', (reason: Error | any) => {
        logger.error('Unhandled Promise Rejection', {
            error: reason?.message || String(reason),
            stack: reason?.stack,
        });
        // In production, you might want to gracefully shutdown
        // process.exit(1);
    });

    process.on('uncaughtException', (error: Error) => {
        logger.error('Uncaught Exception', {
            error: error.message,
            stack: error.stack,
        });
        // Uncaught exceptions should trigger a shutdown
        // process.exit(1);
    });

    logger.info('Process error handlers configured');
};
