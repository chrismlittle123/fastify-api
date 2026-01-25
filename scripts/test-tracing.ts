#!/usr/bin/env tsx
/**
 * Test script to verify OpenTelemetry tracing is working
 *
 * Usage:
 *   # Test with console output (no SigNoz needed)
 *   OTEL_CONSOLE_EXPORTER=true pnpm exec tsx scripts/test-tracing.ts
 *
 *   # Test with SigNoz
 *   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm exec tsx scripts/test-tracing.ts
 */

// Import tracing first to instrument before other imports
// Using .ts extension for tsx runner
import '../src/tracing.ts';

import { trace, SpanStatusCode } from '@opentelemetry/api';
import { createApp } from '../src/index.js';
import { defineRoute, registerRoute } from '../src/routes/index.js';
import { z } from 'zod';

const tracer = trace.getTracer('test-tracing');

async function main() {
  console.log('\n=== Testing OpenTelemetry Integration ===\n');

  // Create a test span manually
  const testSpan = tracer.startSpan('manual-test-span');
  testSpan.setAttribute('test.type', 'manual');
  testSpan.addEvent('test-event', { message: 'Hello from test script' });
  testSpan.setStatus({ code: SpanStatusCode.OK });
  testSpan.end();
  console.log('[test] Created manual span');

  // Create the app
  const app = await createApp({
    name: 'tracing-test',
    server: { port: 0 }, // Random port
    logging: { level: 'info', pretty: true },
  });

  // Add a test route
  const testRoute = defineRoute({
    method: 'GET',
    url: '/test',
    auth: 'public',
    schema: {
      response: {
        200: z.object({ message: z.string(), traceId: z.string().optional() }),
      },
    },
    handler: async (request) => {
      // Get current span
      const currentSpan = trace.getActiveSpan();
      const traceId = currentSpan?.spanContext().traceId;

      // Create a child span
      const span = tracer.startSpan('test-handler-work');
      span.setAttribute('work.type', 'simulated');

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 50));

      span.end();

      return { message: 'Hello from traced route!', traceId };
    },
  });
  registerRoute(app, testRoute);

  // Start the app
  await app.start();
  const address = app.server.address();
  const port = typeof address === 'object' && address ? address.port : 3000;

  console.log(`[test] Server running on port ${port}`);

  // Make some test requests
  console.log('\n[test] Making test requests...\n');

  for (let i = 0; i < 3; i++) {
    const response = await app.inject({
      method: 'GET',
      url: '/test',
    });
    const body = JSON.parse(response.body);
    console.log(`[test] Request ${i + 1}: ${response.statusCode} - traceId: ${body.traceId ?? 'N/A'}`);
  }

  // Test health endpoint
  const healthResponse = await app.inject({
    method: 'GET',
    url: '/health',
  });
  console.log(`[test] Health check: ${healthResponse.statusCode}`);

  // Shutdown
  console.log('\n[test] Shutting down...');
  await app.shutdown();

  // Give time for spans to be exported
  console.log('[test] Waiting for spans to be exported...');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('\n=== Test Complete ===\n');
  console.log('If using OTEL_CONSOLE_EXPORTER=true, you should see span output above.');
  console.log('If using OTEL_EXPORTER_OTLP_ENDPOINT, check your SigNoz UI for traces.');

  process.exit(0);
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
