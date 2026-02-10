import { z } from 'zod';
export declare const appConfigSchema: z.ZodObject<{
    name: z.ZodString;
    server: z.ZodDefault<z.ZodObject<{
        port: z.ZodDefault<z.ZodNumber>;
        host: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        port: number;
        host: string;
    }, {
        port?: number | undefined;
        host?: string | undefined;
    }>>;
    db: z.ZodOptional<z.ZodObject<{
        connectionString: z.ZodString;
        poolSize: z.ZodDefault<z.ZodNumber>;
        idleTimeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        connectionString: string;
        poolSize: number;
        idleTimeout: number;
    }, {
        connectionString: string;
        poolSize?: number | undefined;
        idleTimeout?: number | undefined;
    }>>;
    auth: z.ZodOptional<z.ZodObject<{
        jwt: z.ZodOptional<z.ZodObject<{
            secret: z.ZodString;
            issuer: z.ZodOptional<z.ZodString>;
            audience: z.ZodOptional<z.ZodString>;
            expiresIn: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            secret: string;
            expiresIn: string;
            issuer?: string | undefined;
            audience?: string | undefined;
        }, {
            secret: string;
            issuer?: string | undefined;
            audience?: string | undefined;
            expiresIn?: string | undefined;
        }>>;
        apiKey: z.ZodOptional<z.ZodObject<{
            header: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            header: string;
        }, {
            header?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        jwt?: {
            secret: string;
            expiresIn: string;
            issuer?: string | undefined;
            audience?: string | undefined;
        } | undefined;
        apiKey?: {
            header: string;
        } | undefined;
    }, {
        jwt?: {
            secret: string;
            issuer?: string | undefined;
            audience?: string | undefined;
            expiresIn?: string | undefined;
        } | undefined;
        apiKey?: {
            header?: string | undefined;
        } | undefined;
    }>>;
    docs: z.ZodOptional<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        version: z.ZodDefault<z.ZodString>;
        path: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        title: string;
        version: string;
        description?: string | undefined;
    }, {
        title: string;
        path?: string | undefined;
        description?: string | undefined;
        version?: string | undefined;
    }>>;
    logging: z.ZodDefault<z.ZodObject<{
        level: z.ZodDefault<z.ZodEnum<["fatal", "error", "warn", "info", "debug", "trace"]>>;
        pretty: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        level: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
        pretty: boolean;
    }, {
        level?: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | undefined;
        pretty?: boolean | undefined;
    }>>;
    observability: z.ZodOptional<z.ZodObject<{
        /** OTLP endpoint for SigNoz (e.g., http://signoz:4318) */
        otlpEndpoint: z.ZodOptional<z.ZodString>;
        /** Enable request logging with trace correlation */
        requestLogging: z.ZodDefault<z.ZodBoolean>;
        /** Additional resource attributes for traces */
        attributes: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        requestLogging: boolean;
        otlpEndpoint?: string | undefined;
        attributes?: Record<string, string> | undefined;
    }, {
        otlpEndpoint?: string | undefined;
        requestLogging?: boolean | undefined;
        attributes?: Record<string, string> | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    server: {
        port: number;
        host: string;
    };
    logging: {
        level: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
        pretty: boolean;
    };
    db?: {
        connectionString: string;
        poolSize: number;
        idleTimeout: number;
    } | undefined;
    auth?: {
        jwt?: {
            secret: string;
            expiresIn: string;
            issuer?: string | undefined;
            audience?: string | undefined;
        } | undefined;
        apiKey?: {
            header: string;
        } | undefined;
    } | undefined;
    docs?: {
        path: string;
        title: string;
        version: string;
        description?: string | undefined;
    } | undefined;
    observability?: {
        requestLogging: boolean;
        otlpEndpoint?: string | undefined;
        attributes?: Record<string, string> | undefined;
    } | undefined;
}, {
    name: string;
    server?: {
        port?: number | undefined;
        host?: string | undefined;
    } | undefined;
    db?: {
        connectionString: string;
        poolSize?: number | undefined;
        idleTimeout?: number | undefined;
    } | undefined;
    auth?: {
        jwt?: {
            secret: string;
            issuer?: string | undefined;
            audience?: string | undefined;
            expiresIn?: string | undefined;
        } | undefined;
        apiKey?: {
            header?: string | undefined;
        } | undefined;
    } | undefined;
    docs?: {
        title: string;
        path?: string | undefined;
        description?: string | undefined;
        version?: string | undefined;
    } | undefined;
    logging?: {
        level?: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | undefined;
        pretty?: boolean | undefined;
    } | undefined;
    observability?: {
        otlpEndpoint?: string | undefined;
        requestLogging?: boolean | undefined;
        attributes?: Record<string, string> | undefined;
    } | undefined;
}>;
export type AppConfig = z.infer<typeof appConfigSchema>;
export type AppConfigInput = z.input<typeof appConfigSchema>;
//# sourceMappingURL=schema.d.ts.map