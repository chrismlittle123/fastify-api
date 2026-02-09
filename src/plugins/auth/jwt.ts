import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { AppError } from '../../errors/index.js';

export interface JWTConfig {
  secret: string;
  issuer?: string;
  audience?: string;
  expiresIn?: string;
}

export interface JWTPayload {
  sub: string;
  email?: string;
  roles?: string[];
  [key: string]: unknown;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

export async function registerJWT(app: FastifyInstance, config: JWTConfig): Promise<void> {
  await app.register(fastifyJwt, {
    secret: config.secret,
    sign: {
      iss: config.issuer,
      aud: config.audience,
      expiresIn: config.expiresIn ?? '1h',
    },
    verify: {
      allowedIss: config.issuer ? [config.issuer] : undefined,
      allowedAud: config.audience ? [config.audience] : undefined,
    },
  });

  // Decorator for requiring JWT auth
  app.decorate('authenticateJWT', async function (request: FastifyRequest, _reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      throw AppError.unauthorized('Invalid or expired token');
    }
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticateJWT: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
