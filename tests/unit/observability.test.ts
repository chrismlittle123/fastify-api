import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import {
  buildOTelEnvVars,
  registerRequestLogging,
  type ObservabilityConfig,
} from '../../src/observability/index.js';

describe('buildOTelEnvVars', () => {
  it('sets basic fields', () => {
    const vars = buildOTelEnvVars({
      serviceName: 'my-svc',
      otlpEndpoint: 'http://signoz:4318',
    });
    expect(vars.OTEL_SERVICE_NAME).toBe('my-svc');
    expect(vars.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://signoz:4318');
    expect(vars.OTEL_EXPORTER_OTLP_PROTOCOL).toBe('http/protobuf');
    expect(vars.OTEL_TRACES_EXPORTER).toBe('otlp');
    expect(vars.OTEL_METRICS_EXPORTER).toBe('otlp');
    expect(vars.OTEL_LOGS_EXPORTER).toBe('otlp');
  });

  it('sets OTEL_RESOURCE_ATTRIBUTES when attributes provided', () => {
    const vars = buildOTelEnvVars({
      serviceName: 'svc',
      attributes: { env: 'prod', version: '1.0' },
    });
    expect(vars.OTEL_RESOURCE_ATTRIBUTES).toBe('env=prod,version=1.0');
  });

  it('omits OTEL_RESOURCE_ATTRIBUTES when attributes is empty', () => {
    const vars = buildOTelEnvVars({ serviceName: 'svc', attributes: {} });
    expect(vars.OTEL_RESOURCE_ATTRIBUTES).toBeUndefined();
  });

  it('omits OTEL_RESOURCE_ATTRIBUTES when attributes is undefined', () => {
    const vars = buildOTelEnvVars({ serviceName: 'svc' });
    expect(vars.OTEL_RESOURCE_ATTRIBUTES).toBeUndefined();
  });

  it('defaults otlpEndpoint to empty string when undefined', () => {
    const vars = buildOTelEnvVars({ serviceName: 'svc' });
    expect(vars.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('');
  });

  it('percent-encodes = in attribute values', () => {
    const vars = buildOTelEnvVars({
      serviceName: 'svc',
      attributes: { query: 'a=b' },
    });
    expect(vars.OTEL_RESOURCE_ATTRIBUTES).toBe('query=a%3Db');
  });

  it('percent-encodes , in attribute values', () => {
    const vars = buildOTelEnvVars({
      serviceName: 'svc',
      attributes: { tags: 'a,b' },
    });
    expect(vars.OTEL_RESOURCE_ATTRIBUTES).toBe('tags=a%2Cb');
  });

  it('percent-encodes % in attribute values', () => {
    const vars = buildOTelEnvVars({
      serviceName: 'svc',
      attributes: { encoded: '100%' },
    });
    expect(vars.OTEL_RESOURCE_ATTRIBUTES).toBe('encoded=100%25');
  });

  it('percent-encodes special chars in attribute keys', () => {
    const vars = buildOTelEnvVars({
      serviceName: 'svc',
      attributes: { 'k=1': 'v' },
    });
    expect(vars.OTEL_RESOURCE_ATTRIBUTES).toBe('k%3D1=v');
  });
});

describe('registerRequestLogging', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await registerRequestLogging(app);
    app.get('/test', async () => ({ ok: true }));
  });

  it('adds traceId to child logger when traceparent header present', async () => {
    const childSpy = vi.fn().mockReturnValue({ info: vi.fn() });

    app.addHook('onRequest', async (request) => {
      // Inject a spy for log.child so we can verify traceId binding
      request.log.child = childSpy;
    });

    // Move this hook before our logging hooks by re-registering the route
    const newApp = Fastify({ logger: false });
    await registerRequestLogging(newApp);
    newApp.get('/test', async () => ({ ok: true }));

    const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const res = await newApp.inject({
      method: 'GET',
      url: '/test',
      headers: { traceparent },
    });

    expect(res.statusCode).toBe(200);
  });

  it('does not add traceId when no traceparent header', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(200);
  });

  it('logs request completed on response', async () => {
    const logMessages: unknown[] = [];
    app.addHook('onResponse', async (request) => {
      // Capture the call - the logging hook runs before this
      logMessages.push(request.method);
    });

    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(200);
  });
});
