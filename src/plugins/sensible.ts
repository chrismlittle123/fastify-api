import type { FastifyInstance } from 'fastify';
import fastifySensible from '@fastify/sensible';

export async function registerSensible(app: FastifyInstance): Promise<void> {
  await app.register(fastifySensible, {
    sharedSchemaId: 'HttpError',
  });
}
