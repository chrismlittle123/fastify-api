import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
export function createDatabase(options) {
    const sql = postgres(options.connectionString, {
        max: options.poolSize,
        idle_timeout: options.idleTimeout,
    });
    const db = drizzle(sql);
    return {
        drizzle: db,
        ping: async () => {
            await sql `SELECT 1`;
        },
        close: async () => {
            await sql.end({ timeout: 5 });
        },
    };
}
//# sourceMappingURL=client.js.map