export async function registerHealthCheck(app) {
    app.get('/health', async (_request, _reply) => {
        const checks = {};
        // Check database if available
        if (app.db) {
            const start = Date.now();
            try {
                await app.db.ping();
                checks.database = {
                    status: 'healthy',
                    latencyMs: Date.now() - start,
                };
            }
            catch (error) {
                checks.database = {
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        }
        const hasUnhealthy = Object.values(checks).some((c) => c?.status === 'unhealthy');
        return {
            status: hasUnhealthy ? 'unhealthy' : 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks,
        };
    });
    // Simple liveness probe
    app.get('/health/live', async () => ({ status: 'ok' }));
    // Readiness probe (includes dependency checks)
    app.get('/health/ready', async (_request, reply) => {
        if (app.db) {
            try {
                await app.db.ping();
            }
            catch {
                return reply.status(503).send({ status: 'not ready', reason: 'database unavailable' });
            }
        }
        return { status: 'ready' };
    });
}
//# sourceMappingURL=health.js.map