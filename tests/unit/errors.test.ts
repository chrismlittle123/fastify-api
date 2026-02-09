import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { AppError, ErrorCode, isAppError, registerErrorHandler } from '../../src/errors/index.js';

describe('AppError', () => {
  describe('constructor', () => {
    it('sets name to AppError', () => {
      const err = new AppError(ErrorCode.BAD_REQUEST, 'bad');
      expect(err.name).toBe('AppError');
    });

    it('maps code to correct statusCode', () => {
      expect(new AppError(ErrorCode.BAD_REQUEST, '').statusCode).toBe(400);
      expect(new AppError(ErrorCode.UNAUTHORIZED, '').statusCode).toBe(401);
      expect(new AppError(ErrorCode.FORBIDDEN, '').statusCode).toBe(403);
      expect(new AppError(ErrorCode.NOT_FOUND, '').statusCode).toBe(404);
      expect(new AppError(ErrorCode.CONFLICT, '').statusCode).toBe(409);
      expect(new AppError(ErrorCode.VALIDATION_ERROR, '').statusCode).toBe(422);
      expect(new AppError(ErrorCode.RATE_LIMITED, '').statusCode).toBe(429);
      expect(new AppError(ErrorCode.INTERNAL_ERROR, '').statusCode).toBe(500);
      expect(new AppError(ErrorCode.SERVICE_UNAVAILABLE, '').statusCode).toBe(503);
      expect(new AppError(ErrorCode.DATABASE_ERROR, '').statusCode).toBe(500);
      expect(new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, '').statusCode).toBe(502);
    });

    it('stores details', () => {
      const err = new AppError(ErrorCode.BAD_REQUEST, 'bad', { details: { field: 'x' } });
      expect(err.details).toEqual({ field: 'x' });
    });

    it('stores cause', () => {
      const cause = new Error('root');
      const err = new AppError(ErrorCode.INTERNAL_ERROR, 'fail', { cause });
      expect(err.cause).toBe(cause);
    });

    it('defaults isOperational to true', () => {
      const err = new AppError(ErrorCode.BAD_REQUEST, 'bad');
      expect(err.isOperational).toBe(true);
    });

    it('allows overriding isOperational', () => {
      const err = new AppError(ErrorCode.INTERNAL_ERROR, 'fail', { isOperational: false });
      expect(err.isOperational).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('includes code and message', () => {
      const err = new AppError(ErrorCode.NOT_FOUND, 'gone');
      expect(err.toJSON()).toEqual({
        error: { code: ErrorCode.NOT_FOUND, message: 'gone' },
      });
    });

    it('includes details when present', () => {
      const err = new AppError(ErrorCode.BAD_REQUEST, 'bad', { details: { field: 'x' } });
      expect(err.toJSON()).toEqual({
        error: { code: ErrorCode.BAD_REQUEST, message: 'bad', details: { field: 'x' } },
      });
    });

    it('omits details when undefined', () => {
      const json = new AppError(ErrorCode.BAD_REQUEST, 'bad').toJSON();
      expect(json.error).not.toHaveProperty('details');
    });
  });

  describe('factory methods', () => {
    it('badRequest', () => {
      const err = AppError.badRequest('oops', { field: 'x' });
      expect(err.code).toBe(ErrorCode.BAD_REQUEST);
      expect(err.message).toBe('oops');
      expect(err.details).toEqual({ field: 'x' });
    });

    it('unauthorized with default message', () => {
      const err = AppError.unauthorized();
      expect(err.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(err.message).toBe('Authentication required');
    });

    it('unauthorized with custom message', () => {
      expect(AppError.unauthorized('nope').message).toBe('nope');
    });

    it('forbidden with default message', () => {
      const err = AppError.forbidden();
      expect(err.code).toBe(ErrorCode.FORBIDDEN);
      expect(err.message).toBe('Access denied');
    });

    it('forbidden with custom message', () => {
      expect(AppError.forbidden('no way').message).toBe('no way');
    });

    it('notFound without id', () => {
      const err = AppError.notFound('User');
      expect(err.message).toBe('User not found');
      expect(err.details).toEqual({ resource: 'User', id: undefined });
    });

    it('notFound with id', () => {
      const err = AppError.notFound('User', '123');
      expect(err.message).toBe("User with id '123' not found");
      expect(err.details).toEqual({ resource: 'User', id: '123' });
    });

    it('conflict', () => {
      const err = AppError.conflict('dup', { key: 'email' });
      expect(err.code).toBe(ErrorCode.CONFLICT);
      expect(err.details).toEqual({ key: 'email' });
    });

    it('validationError', () => {
      const err = AppError.validationError('invalid', { fields: ['a'] });
      expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(err.statusCode).toBe(422);
      expect(err.details).toEqual({ fields: ['a'] });
    });

    it('rateLimited without retryAfter', () => {
      const err = AppError.rateLimited();
      expect(err.code).toBe(ErrorCode.RATE_LIMITED);
      expect(err.message).toBe('Too many requests');
      expect(err.details).toBeUndefined();
    });

    it('rateLimited with retryAfter', () => {
      const err = AppError.rateLimited(60);
      expect(err.details).toEqual({ retryAfter: 60 });
    });

    it('internal with default message', () => {
      const err = AppError.internal();
      expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(err.message).toBe('Internal server error');
      expect(err.isOperational).toBe(false);
    });

    it('internal with cause', () => {
      const cause = new Error('boom');
      const err = AppError.internal('fail', cause);
      expect(err.cause).toBe(cause);
    });

    it('serviceUnavailable with default message', () => {
      const err = AppError.serviceUnavailable();
      expect(err.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
      expect(err.message).toBe('Service temporarily unavailable');
    });

    it('databaseError', () => {
      const cause = new Error('conn');
      const err = AppError.databaseError('db fail', cause);
      expect(err.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(err.isOperational).toBe(false);
      expect(err.cause).toBe(cause);
    });

    it('externalServiceError', () => {
      const cause = new Error('timeout');
      const err = AppError.externalServiceError('stripe', 'failed', cause);
      expect(err.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
      expect(err.details).toEqual({ service: 'stripe' });
      expect(err.cause).toBe(cause);
    });
  });
});

describe('isAppError', () => {
  it('returns true for AppError', () => {
    expect(isAppError(new AppError(ErrorCode.BAD_REQUEST, 'x'))).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isAppError(new Error('x'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAppError(null)).toBe(false);
  });
});

describe('registerErrorHandler', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await registerErrorHandler(app);
  });

  it('handles AppError', async () => {
    app.get('/test', async () => {
      throw AppError.notFound('Item', '1');
    });

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: "Item with id '1' not found",
        details: { resource: 'Item', id: '1' },
      },
    });
  });

  it('handles HTTP errors with statusCode property', async () => {
    app.get('/test', async () => {
      const err = Object.assign(new Error('Not Found'), { statusCode: 404 });
      throw err;
    });

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('handles ZodError', async () => {
    app.get('/test', async () => {
      const err = Object.assign(new Error('Validation'), {
        name: 'ZodError',
        issues: [{ path: ['name'], message: 'Required' }],
      });
      throw err;
    });

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.issues).toEqual([{ path: 'name', message: 'Required' }]);
  });

  it('handles unknown errors', async () => {
    app.get('/test', async () => {
      throw new Error('something broke');
    });

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(500);
    expect(res.json().error.code).toBe('INTERNAL_ERROR');
    expect(res.json().error.message).toBe('An unexpected error occurred');
  });

  it('maps unknown >=500 status to INTERNAL_ERROR', async () => {
    app.get('/test', async () => {
      throw Object.assign(new Error('bad gateway'), { statusCode: 504 });
    });

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(504);
    expect(res.json().error.code).toBe('INTERNAL_ERROR');
  });

  it('maps unknown <500 status to BAD_REQUEST', async () => {
    app.get('/test', async () => {
      throw Object.assign(new Error('teapot'), { statusCode: 418 });
    });

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(418);
    expect(res.json().error.code).toBe('BAD_REQUEST');
  });
});
