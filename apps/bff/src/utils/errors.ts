/**
 * Custom error classes for structured error handling
 * These provide consistent error responses across the API
 */

/**
 * Base application error class
 * All custom errors should extend this
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly details?: Record<string, any>;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        isOperational: boolean = true,
        details?: Record<string, any>
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;
        
        // Maintains proper stack trace for where the error was thrown
        Error.captureStackTrace(this, this.constructor);
        
        // Set the prototype explicitly for instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
    }

    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message,
                ...(this.details && { details: this.details }),
            }
        };
    }
}

/**
 * 400 Bad Request - Invalid input from client
 */
export class BadRequestError extends AppError {
    constructor(message: string = 'Bad request', details?: Record<string, any>) {
        super(message, 400, 'BAD_REQUEST', true, details);
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED', true);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

/**
 * 403 Forbidden - Valid auth but insufficient permissions
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403, 'FORBIDDEN', true);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND', true);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * 409 Conflict - Resource already exists or state conflict
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict') {
        super(message, 409, 'CONFLICT', true);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

/**
 * 413 Payload Too Large - File or request too big
 */
export class PayloadTooLargeError extends AppError {
    constructor(maxSize: string = '10MB') {
        super(`Payload too large. Maximum size is ${maxSize}`, 413, 'PAYLOAD_TOO_LARGE', true);
        Object.setPrototypeOf(this, PayloadTooLargeError.prototype);
    }
}

/**
 * 422 Unprocessable Entity - Valid request but cannot be processed
 */
export class UnprocessableEntityError extends AppError {
    constructor(message: string = 'Unprocessable entity', details?: Record<string, any>) {
        super(message, 422, 'UNPROCESSABLE_ENTITY', true, details);
        Object.setPrototypeOf(this, UnprocessableEntityError.prototype);
    }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
    public readonly retryAfter?: number;

    constructor(message: string = 'Too many requests', retryAfter?: number) {
        super(message, 429, 'RATE_LIMIT_EXCEEDED', true, retryAfter ? { retryAfter } : undefined);
        this.retryAfter = retryAfter;
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}

/**
 * 500 Internal Server Error - Unexpected server errors
 */
export class InternalError extends AppError {
    constructor(message: string = 'Internal server error') {
        super(message, 500, 'INTERNAL_ERROR', false);
        Object.setPrototypeOf(this, InternalError.prototype);
    }
}

/**
 * 502 Bad Gateway - External service error
 */
export class ExternalServiceError extends AppError {
    constructor(service: string, message?: string) {
        super(
            message || `External service error: ${service}`,
            502,
            'EXTERNAL_SERVICE_ERROR',
            true,
            { service }
        );
        Object.setPrototypeOf(this, ExternalServiceError.prototype);
    }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
    constructor(message: string = 'Service temporarily unavailable') {
        super(message, 503, 'SERVICE_UNAVAILABLE', true);
        Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
    }
}

/**
 * AI-specific errors
 */
export class AIAnalysisError extends AppError {
    constructor(message: string = 'AI analysis failed', details?: Record<string, any>) {
        super(message, 500, 'AI_ANALYSIS_ERROR', true, details);
        Object.setPrototypeOf(this, AIAnalysisError.prototype);
    }
}

export class AIRateLimitError extends RateLimitError {
    constructor(retryAfter?: number) {
        super('AI service rate limit exceeded. Please wait a moment and try again.', retryAfter);
        Object.setPrototypeOf(this, AIRateLimitError.prototype);
    }
}

/**
 * Storage-specific errors
 */
export class StorageError extends AppError {
    constructor(message: string = 'Storage operation failed', details?: Record<string, any>) {
        super(message, 500, 'STORAGE_ERROR', true, details);
        Object.setPrototypeOf(this, StorageError.prototype);
    }
}

/**
 * Database-specific errors
 */
export class DatabaseError extends AppError {
    constructor(message: string = 'Database operation failed', details?: Record<string, any>) {
        super(message, 500, 'DATABASE_ERROR', true, details);
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}

/**
 * Validation error with field-level details
 */
export class ValidationError extends BadRequestError {
    public readonly fields: Record<string, string>;

    constructor(message: string = 'Validation failed', fields: Record<string, string> = {}) {
        super(message, { fields });
        this.fields = fields;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * Check if an error is an operational error (expected) vs programming error (bug)
 */
export function isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}

/**
 * Convert Supabase errors to AppError
 */
export function fromSupabaseError(error: any): AppError {
    const code = error.code;
    const message = error.message || 'Database error';

    switch (code) {
        case 'PGRST116': // No rows returned
            return new NotFoundError('Resource');
        case '23505': // Unique violation
            return new ConflictError('Resource already exists');
        case '23503': // Foreign key violation
            return new BadRequestError('Referenced resource does not exist');
        case '23502': // Not null violation
            return new BadRequestError('Required field is missing');
        case '42501': // Insufficient privilege
            return new ForbiddenError('Insufficient permissions');
        case 'PGRST301': // JWT error
            return new UnauthorizedError('Invalid authentication');
        default:
            return new DatabaseError(message, { code });
    }
}
