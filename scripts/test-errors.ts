#!/usr/bin/env tsx
/**
 * Test script to generate errors for SigNoz error tracking
 *
 * Usage:
 *   OTEL_EXPORTER_OTLP_ENDPOINT=http://13.40.52.138:4318 pnpm exec tsx scripts/test-errors.ts
 */

// Import tracing first to instrument before other imports
import '../src/tracing.ts';

import { trace, SpanStatusCode } from '@opentelemetry/api';
import { createApp } from '../src/index.js';
import { defineRoute, registerRoute } from '../src/routes/index.js';
import { z } from 'zod';

const tracer = trace.getTracer('error-test');

async function main() {
  console.log('\n=== Testing Error Tracking in SigNoz ===\n');

  // Create the app
  const app = await createApp({
    name: 'error-test-api',
    server: { port: 0 },
    logging: { level: 'info', pretty: true },
  });

  // Route 1: Throws an unhandled error
  const errorRoute = defineRoute({
    method: 'GET',
    url: '/error/throw',
    auth: 'public',
    schema: {
      response: {
        200: z.object({ message: z.string() }),
      },
    },
    handler: async () => {
      const span = trace.getActiveSpan();
      span?.setAttribute('error.test', 'unhandled-exception');

      // This will throw and be caught by Fastify's error handler
      throw new Error('Intentional test error: Something went wrong!');
    },
  });

  // Route 2: Returns a 500 error explicitly
  const serverErrorRoute = defineRoute({
    method: 'GET',
    url: '/error/500',
    auth: 'public',
    schema: {
      response: {
        500: z.object({ error: z.string(), statusCode: z.number() }),
      },
    },
    handler: async (_request, reply) => {
      const span = trace.getActiveSpan();
      span?.setStatus({ code: SpanStatusCode.ERROR, message: 'Internal server error' });
      span?.setAttribute('error.type', 'internal_server_error');

      return reply.status(500).send({
        error: 'Internal Server Error: Database connection failed',
        statusCode: 500,
      });
    },
  });

  // Route 3: Validation error (400)
  const validationRoute = defineRoute({
    method: 'POST',
    url: '/error/validation',
    auth: 'public',
    schema: {
      body: z.object({
        email: z.string().email(),
        age: z.number().min(18),
      }),
      response: {
        200: z.object({ success: z.boolean() }),
      },
    },
    handler: async () => {
      return { success: true };
    },
  });

  // Route 4: Simulated timeout/slow endpoint
  const timeoutRoute = defineRoute({
    method: 'GET',
    url: '/error/timeout',
    auth: 'public',
    schema: {
      response: {
        200: z.object({ message: z.string() }),
      },
    },
    handler: async () => {
      const span = trace.getActiveSpan();
      span?.setAttribute('operation', 'slow-database-query');

      // Simulate slow operation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Then fail
      span?.setStatus({ code: SpanStatusCode.ERROR, message: 'Operation timed out' });
      throw new Error('Database query timed out after 2000ms');
    },
  });

  // Route 5: Create error span manually
  const manualErrorRoute = defineRoute({
    method: 'GET',
    url: '/error/manual',
    auth: 'public',
    schema: {
      response: {
        200: z.object({ message: z.string() }),
      },
    },
    handler: async () => {
      // Create a child span that records an error
      const span = tracer.startSpan('external-api-call');
      span.setAttribute('http.url', 'https://api.example.com/data');
      span.setAttribute('http.method', 'GET');

      // Simulate API call failure
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Record the error
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'External API returned 503' });
      span.recordException(new Error('Service Unavailable: External API is down'));
      span.setAttribute('http.status_code', 503);
      span.end();

      // But return success from our endpoint (error was in child span)
      return { message: 'Partial success - external API failed but we handled it' };
    },
  });

  // Register all routes
  registerRoute(app, errorRoute);
  registerRoute(app, serverErrorRoute);
  registerRoute(app, validationRoute);
  registerRoute(app, timeoutRoute);
  registerRoute(app, manualErrorRoute);

  // Start the app
  await app.start();
  const address = app.server.address();
  const port = typeof address === 'object' && address ? address.port : 3000;

  console.log(`[test] Server running on port ${port}`);
  console.log('\n[test] Generating errors...\n');

  // Test 1: Unhandled exception
  console.log('--- Test 1: Unhandled Exception ---');
  const res1 = await app.inject({ method: 'GET', url: '/error/throw' });
  console.log(`Response: ${res1.statusCode} - ${res1.body}\n`);

  // Test 2: Explicit 500 error
  console.log('--- Test 2: Explicit 500 Error ---');
  const res2 = await app.inject({ method: 'GET', url: '/error/500' });
  console.log(`Response: ${res2.statusCode} - ${res2.body}\n`);

  // Test 3: Validation error
  console.log('--- Test 3: Validation Error (invalid email) ---');
  const res3 = await app.inject({
    method: 'POST',
    url: '/error/validation',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ email: 'not-an-email', age: 15 }),
  });
  console.log(`Response: ${res3.statusCode} - ${res3.body}\n`);

  // Test 4: Timeout error
  console.log('--- Test 4: Timeout Error (takes ~2s) ---');
  const res4 = await app.inject({ method: 'GET', url: '/error/timeout' });
  console.log(`Response: ${res4.statusCode} - ${res4.body}\n`);

  // Test 5: Manual error span
  console.log('--- Test 5: Manual Error Span (external API failure) ---');
  const res5 = await app.inject({ method: 'GET', url: '/error/manual' });
  console.log(`Response: ${res5.statusCode} - ${res5.body}\n`);

  // Also make some successful requests for comparison
  console.log('--- Making successful health check for comparison ---');
  const healthRes = await app.inject({ method: 'GET', url: '/health' });
  console.log(`Health: ${healthRes.statusCode}\n`);

  // Shutdown
  console.log('[test] Shutting down...');
  await app.shutdown();

  // Wait longer for batch processor to flush
  console.log('[test] Waiting 5s for spans to be exported...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log('\n=== Error Test Complete ===\n');
  console.log('Check SigNoz UI at http://13.40.52.138:8080');
  console.log('- Go to Traces tab and filter by service "error-test-api"');
  console.log('- Look for spans with hasError=true');
  console.log('- Check the Exceptions tab for recorded exceptions');

  process.exit(0);
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
