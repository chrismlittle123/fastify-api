import type { FastifyInstance } from 'fastify';
/**
 * Error codes for structured error handling
 */
export declare enum ErrorCode {
    BAD_REQUEST = "BAD_REQUEST",
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    NOT_FOUND = "NOT_FOUND",
    CONFLICT = "CONFLICT",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    RATE_LIMITED = "RATE_LIMITED",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    DATABASE_ERROR = "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
}
/**
 * Structured application error with code, message, and optional details
 */
export declare class AppError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly details?: Record<string, unknown>;
    readonly isOperational: boolean;
    constructor(code: ErrorCode, message: string, options?: {
        details?: Record<string, unknown>;
        cause?: Error;
        isOperational?: boolean;
    });
    /**
     * Serialize error for API response
     */
    toJSON(): {
        error: {
            code: ErrorCode;
            message: string;
            details?: Record<string, unknown>;
        };
    };
    static badRequest(message: string, details?: Record<string, unknown>): AppError;
    static unauthorized(message?: string): AppError;
    static forbidden(message?: string): AppError;
    static notFound(resource: string, id?: string): AppError;
    static conflict(message: string, details?: Record<string, unknown>): AppError;
    static validationError(message: string, details?: Record<string, unknown>): AppError;
    static rateLimited(retryAfter?: number): AppError;
    static internal(message?: string, cause?: Error): AppError;
    static serviceUnavailable(message?: string): AppError;
    static databaseError(message: string, cause?: Error): AppError;
    static externalServiceError(service: string, message: string, cause?: Error): AppError;
}
/**
 * Type guard to check if an error is an AppError
 */
export declare function isAppError(error: unknown): error is AppError;
/**
 * Register the error handler plugin
 */
export declare function registerErrorHandler(app: FastifyInstance): Promise<void>;
//# sourceMappingURL=index.d.ts.map