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
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  type LogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { logs } from '@opentelemetry/api-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { ConsoleSpanExporter, SimpleSpanProcessor, BatchSpanProcessor, type SpanProcessor } from '@opentelemetry/sdk-trace-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Enable debug logging if OTEL_DEBUG is set
if (process.env['OTEL_DEBUG'] === 'true') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
const serviceName = process.env['OTEL_SERVICE_NAME'] ?? 'fastify-api';
const useConsoleExporter = process.env['OTEL_CONSOLE_EXPORTER'] === 'true';

// Build resource with service info
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
  [ATTR_SERVICE_VERSION]: process.env['npm_package_version'] ?? '0.0.0',
  'deployment.environment': process.env['NODE_ENV'] ?? 'development',
});

// Configure trace exporter and span processor
// Use SimpleSpanProcessor for console (immediate export) or BatchSpanProcessor for OTLP
let spanProcessor: SpanProcessor | undefined;
if (useConsoleExporter) {
  spanProcessor = new SimpleSpanProcessor(new ConsoleSpanExporter());
} else if (otlpEndpoint) {
  spanProcessor = new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    })
  );
}

// Configure metric exporter (only if OTLP endpoint is set)
const metricReader = otlpEndpoint
  ? new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${otlpEndpoint}/v1/metrics`,
      }),
      exportIntervalMillis: 60000,
    })
  : undefined;

// Configure log exporter and logger provider
// This captures Pino logs (via auto-instrumentation) and sends them to SigNoz
const logProcessors: LogRecordProcessor[] = [];
if (useConsoleExporter) {
  logProcessors.push(new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()));
} else if (otlpEndpoint) {
  logProcessors.push(
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${otlpEndpoint}/v1/logs`,
      })
    )
  );
}

const loggerProvider = new LoggerProvider({
  resource,
  processors: logProcessors.length > 0 ? logProcessors : undefined,
});

// Register the logger provider globally so Pino instrumentation can use it
logs.setGlobalLoggerProvider(loggerProvider);

if (!spanProcessor) {
  console.warn(
    '[tracing] No OTEL_EXPORTER_OTLP_ENDPOINT set. Set OTEL_CONSOLE_EXPORTER=true for local debugging.'
  );
}

const sdk = new NodeSDK({
  resource,
  spanProcessor,
  metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
    }),
  ],
});

sdk.start();

console.warn(`[tracing] OpenTelemetry initialized for service: ${serviceName}`);
if (otlpEndpoint) {
  console.warn(`[tracing] Sending traces, metrics, and logs to: ${otlpEndpoint}`);
}

// Graceful shutdown
const shutdown = async () => {
  try {
    await Promise.all([sdk.shutdown(), loggerProvider.shutdown()]);
    console.warn('[tracing] OpenTelemetry shut down successfully');
  } catch (error) {
    console.error('[tracing] Error shutting down OpenTelemetry:', error);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { sdk };
