import { z } from 'zod';

export const appConfigSchema = z.object({
  name: z.string().min(1).describe('Application name'),

  server: z
    .object({
      port: z.number().int().nonnegative().default(3000), // 0 = random port
      host: z.string().default('0.0.0.0'),
    })
    .default({}),

  db: z
    .object({
      connectionString: z.string().url().describe('PostgreSQL connection string'),
      poolSize: z.number().int().positive().default(10),
      idleTimeout: z.number().int().positive().default(30),
    })
    .optional(),

  auth: z
    .object({
      jwt: z
        .object({
          secret: z.string().min(32).describe('JWT secret (min 32 chars)'),
          issuer: z.string().optional(),
          audience: z.string().optional(),
          expiresIn: z.string().default('1h'),
        })
        .optional(),
      apiKey: z
        .object({
          header: z.string().default('X-API-Key'),
        })
        .optional(),
    })
    .optional(),

  docs: z
    .object({
      title: z.string(),
      description: z.string().optional(),
      version: z.string().default('1.0.0'),
      path: z.string().default('/docs'),
    })
    .optional(),

  logging: z
    .object({
      level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
      pretty: z.boolean().default(process.env['NODE_ENV'] !== 'production'),
    })
    .default({}),

  observability: z
    .object({
      /** OTLP endpoint for SigNoz (e.g., http://signoz:4318) */
      otlpEndpoint: z.string().url().optional(),
      /** Enable request logging with trace correlation */
      requestLogging: z.boolean().default(true),
      /** Additional resource attributes for traces */
      attributes: z.record(z.string()).optional(),
    })
    .optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export type AppConfigInput = z.input<typeof appConfigSchema>;
