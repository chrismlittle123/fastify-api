import type { FastifyInstance } from 'fastify';
/**
 * Observability configuration for SigNoz integration via OpenTelemetry
 */
export interface ObservabilityConfig {
    /** Service name for tracing */
    serviceName: string;
    /** OTLP endpoint URL (e.g., http://signoz:4318 for HTTP or signoz:4317 for gRPC) */
    otlpEndpoint?: string;
    /** Whether to enable tracing (default: true if endpoint is provided) */
    enabled?: boolean;
    /** Additional resource attributes */
    attributes?: Record<string, string>;
}
/**
 * Environment variables for OpenTelemetry configuration
 * These are read by the OpenTelemetry SDK automatically
 */
export interface OTelEnvVars {
    OTEL_SERVICE_NAME: string;
    OTEL_EXPORTER_OTLP_ENDPOINT: string;
    OTEL_EXPORTER_OTLP_PROTOCOL?: 'grpc' | 'http/protobuf' | 'http/json';
    OTEL_TRACES_EXPORTER?: string;
    OTEL_METRICS_EXPORTER?: string;
    OTEL_LOGS_EXPORTER?: string;
    OTEL_RESOURCE_ATTRIBUTES?: string;
}
/**
 * Build OTEL environment variables from config
 */
export declare function buildOTelEnvVars(config: ObservabilityConfig): OTelEnvVars;
/**
 * Instructions for instrumenting the app with OpenTelemetry
 *
 * To enable tracing, install the following packages:
 * ```
 * pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
 * ```
 *
 * Then create a tracing.ts file that runs before your app:
 * ```typescript
 * import { NodeSDK } from '@opentelemetry/sdk-node';
 * import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
 * import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
 *
 * const sdk = new NodeSDK({
 *   traceExporter: new OTLPTraceExporter(),
 *   instrumentations: [getNodeAutoInstrumentations()],
 * });
 *
 * sdk.start();
 * ```
 *
 * Run your app with:
 * ```
 * node --import ./tracing.js dist/server.js
 * ```
 */
/**
 * Minimal request logging hook for observability
 * This adds structured logging that can be correlated with traces
 */
export declare function registerRequestLogging(app: FastifyInstance): Promise<void>;
//# sourceMappingURL=index.d.ts.map