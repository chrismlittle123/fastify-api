/**
 * Error codes for structured error handling
 */
export var ErrorCode;
(function (ErrorCode) {
    // Client errors (4xx)
    ErrorCode["BAD_REQUEST"] = "BAD_REQUEST";
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["CONFLICT"] = "CONFLICT";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    // Server errors (5xx)
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
})(ErrorCode || (ErrorCode = {}));
/**
 * Maps error codes to HTTP status codes
 */
const ERROR_STATUS_MAP = {
    [ErrorCode.BAD_REQUEST]: 400,
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.VALIDATION_ERROR]: 422,
    [ErrorCode.RATE_LIMITED]: 429,
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
    [ErrorCode.DATABASE_ERROR]: 500,
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
};
/**
 * Structured application error with code, message, and optional details
 */
export class AppError extends Error {
    code;
    statusCode;
    details;
    isOperational;
    constructor(code, message, options) {
        super(message, { cause: options?.cause });
        this.name = 'AppError';
        this.code = code;
        this.statusCode = ERROR_STATUS_MAP[code];
        this.details = options?.details;
        this.isOperational = options?.isOperational ?? true;
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
    /**
     * Serialize error for API response
     */
    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message,
                ...(this.details && { details: this.details }),
            },
        };
    }
    // Factory methods for common errors
    static badRequest(message, details) {
        return new AppError(ErrorCode.BAD_REQUEST, message, { details });
    }
    static unauthorized(message = 'Authentication required') {
        return new AppError(ErrorCode.UNAUTHORIZED, message);
    }
    static forbidden(message = 'Access denied') {
        return new AppError(ErrorCode.FORBIDDEN, message);
    }
    static notFound(resource, id) {
        const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
        return new AppError(ErrorCode.NOT_FOUND, message, { details: { resource, id } });
    }
    static conflict(message, details) {
        return new AppError(ErrorCode.CONFLICT, message, { details });
    }
    static validationError(message, details) {
        return new AppError(ErrorCode.VALIDATION_ERROR, message, { details });
    }
    static rateLimited(retryAfter) {
        return new AppError(ErrorCode.RATE_LIMITED, 'Too many requests', {
            details: retryAfter ? { retryAfter } : undefined,
        });
    }
    static internal(message = 'Internal server error', cause) {
        return new AppError(ErrorCode.INTERNAL_ERROR, message, {
            cause,
            isOperational: false,
        });
    }
    static serviceUnavailable(message = 'Service temporarily unavailable') {
        return new AppError(ErrorCode.SERVICE_UNAVAILABLE, message);
    }
    static databaseError(message, cause) {
        return new AppError(ErrorCode.DATABASE_ERROR, message, {
            cause,
            isOperational: false,
        });
    }
    static externalServiceError(service, message, cause) {
        return new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, message, {
            details: { service },
            cause,
        });
    }
}
/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error) {
    return error instanceof AppError;
}
async function handleError(error, request, reply) {
    if (isAppError(error)) {
        request.log.error({
            code: error.code,
            message: error.message,
            details: error.details,
            stack: error.stack,
            cause: error.cause,
        }, 'Application error');
        await reply.status(error.statusCode).send(error.toJSON());
        return;
    }
    if ('statusCode' in error && typeof error.statusCode === 'number') {
        const httpError = error;
        const code = httpStatusToErrorCode(httpError.statusCode);
        const appError = new AppError(code, error.message);
        request.log.error({ err: error }, 'HTTP error');
        await reply.status(httpError.statusCode).send(appError.toJSON());
        return;
    }
    if (error.name === 'ZodError' && 'issues' in error) {
        const zodError = error;
        const appError = AppError.validationError('Validation failed', {
            issues: zodError.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            })),
        });
        await reply.status(appError.statusCode).send(appError.toJSON());
        return;
    }
    request.log.error({ err: error }, 'Unhandled error');
    const unknownError = AppError.internal('An unexpected error occurred', error);
    await reply.status(500).send(unknownError.toJSON());
}
/**
 * Register the error handler plugin
 */
export async function registerErrorHandler(app) {
    app.setErrorHandler(handleError);
}
/**
 * Map an HTTP status code to the closest ErrorCode enum value
 */
function httpStatusToErrorCode(statusCode) {
    const map = {
        400: ErrorCode.BAD_REQUEST,
        401: ErrorCode.UNAUTHORIZED,
        403: ErrorCode.FORBIDDEN,
        404: ErrorCode.NOT_FOUND,
        409: ErrorCode.CONFLICT,
        422: ErrorCode.VALIDATION_ERROR,
        429: ErrorCode.RATE_LIMITED,
        502: ErrorCode.EXTERNAL_SERVICE_ERROR,
        503: ErrorCode.SERVICE_UNAVAILABLE,
    };
    return map[statusCode] ?? (statusCode >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST);
}
//# sourceMappingURL=index.js.map