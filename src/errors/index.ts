import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Error codes for structured error handling
 */
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Maps error codes to HTTP status codes
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
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
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;
  readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
      isOperational?: boolean;
    }
  ) {
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
  toJSON(): {
    error: {
      code: ErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }

  // Factory methods for common errors
  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(ErrorCode.BAD_REQUEST, message, { details });
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message);
  }

  static notFound(resource: string, id?: string): AppError {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    return new AppError(ErrorCode.NOT_FOUND, message, { details: { resource, id } });
  }

  static conflict(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(ErrorCode.CONFLICT, message, { details });
  }

  static validationError(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, { details });
  }

  static rateLimited(retryAfter?: number): AppError {
    return new AppError(ErrorCode.RATE_LIMITED, 'Too many requests', {
      details: retryAfter ? { retryAfter } : undefined,
    });
  }

  static internal(message = 'Internal server error', cause?: Error): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, {
      cause,
      isOperational: false,
    });
  }

  static serviceUnavailable(message = 'Service temporarily unavailable'): AppError {
    return new AppError(ErrorCode.SERVICE_UNAVAILABLE, message);
  }

  static databaseError(message: string, cause?: Error): AppError {
    return new AppError(ErrorCode.DATABASE_ERROR, message, {
      cause,
      isOperational: false,
    });
  }

  static externalServiceError(service: string, message: string, cause?: Error): AppError {
    return new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, message, {
      details: { service },
      cause,
    });
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

async function handleError(error: Error, request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (isAppError(error)) {
    request.log.error(
      {
        code: error.code,
        message: error.message,
        details: error.details,
        stack: error.stack,
        cause: error.cause,
      },
      'Application error'
    );

    await reply.status(error.statusCode).send(error.toJSON());
    return;
  }

  if ('statusCode' in error && typeof error.statusCode === 'number') {
    const httpError = error as Error & { statusCode: number; expose?: boolean };
    const code = httpStatusToErrorCode(httpError.statusCode);
    const appError = new AppError(code, error.message);

    request.log.error({ err: error }, 'HTTP error');
    await reply.status(httpError.statusCode).send(appError.toJSON());
    return;
  }

  if (error.name === 'ZodError' && 'issues' in error) {
    const zodError = error as Error & { issues: { path: (string | number)[]; message: string }[] };
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
export async function registerErrorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler(handleError);
}

/**
 * Map an HTTP status code to the closest ErrorCode enum value
 */
function httpStatusToErrorCode(statusCode: number): ErrorCode {
  const map: Record<number, ErrorCode> = {
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
