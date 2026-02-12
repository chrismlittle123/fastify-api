/**
 * OpenTelemetry tracing setup for SigNoz integration
 *
 * This file should be imported before your application starts.
 * Run with: node --import ./dist/tracing.js dist/server.js
 *
 * Environment variables:
 * - SIGNOZ_SECRET_ID: AWS Secrets Manager secret ID for the OTLP endpoint
 * - SIGNOZ_SECRET_REGION: AWS region for Secrets Manager (default: eu-west-2)
 * - OTEL_EXPORTER_OTLP_ENDPOINT: Fallback if no secret ID is set (local dev)
 * - OTEL_SERVICE_NAME: Service name for traces (default: fastify-api)
 * - OTEL_CONSOLE_EXPORTER: Set to 'true' for local debugging (console output)
 * - OTEL_DEBUG: Set to 'true' for OpenTelemetry debug logs
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
declare const sdk: NodeSDK;
export { sdk };
//# sourceMappingURL=tracing.d.ts.map