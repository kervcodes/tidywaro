import { Request, Response, NextFunction } from 'express';
import logger, { logRequest, logResponse } from '../utils/logger';

/**
 * Express middleware for logging all HTTP requests and responses
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log incoming request
    const userId = (req as any).user?.id;
    logRequest(req.method, req.path, userId);
    
    // Log request body for POST/PUT (excluding sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        const safeBody = { ...req.body };
        // Remove sensitive fields
        delete safeBody.password;
        delete safeBody.token;
        delete safeBody.accessToken;
        
        if (Object.keys(safeBody).length > 0) {
            logger.debug('Request body', { body: safeBody });
        }
    }
    
    // Capture response
    const originalSend = res.send;
    res.send = function(body) {
        const duration = Date.now() - startTime;
        logResponse(req.method, req.path, res.statusCode, duration);
        
        return originalSend.call(this, body);
    };
    
    next();
};

export default requestLogger;
