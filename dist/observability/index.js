/**
 * Build OTEL environment variables from config
 */
export function buildOTelEnvVars(config) {
    const envVars = {
        OTEL_SERVICE_NAME: config.serviceName,
        OTEL_EXPORTER_OTLP_ENDPOINT: config.otlpEndpoint ?? '',
        OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
        OTEL_TRACES_EXPORTER: 'otlp',
        OTEL_METRICS_EXPORTER: 'otlp',
        OTEL_LOGS_EXPORTER: 'otlp',
    };
    if (config.attributes && Object.keys(config.attributes).length > 0) {
        envVars.OTEL_RESOURCE_ATTRIBUTES = Object.entries(config.attributes)
            .map(([key, value]) => `${key}=${value}`)
            .join(',');
    }
    return envVars;
}
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
export async function registerRequestLogging(app) {
    app.addHook('onRequest', async (request) => {
        // Extract trace context from headers if present
        const traceParent = request.headers['traceparent'];
        const traceId = traceParent?.split('-')[1];
        // Add trace ID to request log context
        if (traceId) {
            request.log = request.log.child({ traceId });
        }
    });
    app.addHook('onResponse', async (request, reply) => {
        request.log.info({
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            responseTime: reply.elapsedTime,
        }, 'request completed');
    });
}
//# sourceMappingURL=index.js.map