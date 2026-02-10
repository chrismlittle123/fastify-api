/**
 * OpenTelemetry tracing setup for SigNoz integration
 *
 * This file should be imported before your application starts.
 * Run with: node --import ./dist/tracing.js dist/server.js
 *
 * Environment variables:
 * - OTEL_EXPORTER_OTLP_ENDPOINT: SigNoz endpoint (e.g., http://signoz:4318)
 * - OTEL_SERVICE_NAME: Service name for traces (default: fastify-api)
 * - OTEL_CONSOLE_EXPORTER: Set to 'true' for local debugging (console output)
 * - OTEL_DEBUG: Set to 'true' for OpenTelemetry debug logs
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
declare const sdk: NodeSDK;
export { sdk };
//# sourceMappingURL=tracing.d.ts.map