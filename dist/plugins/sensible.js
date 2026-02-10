import fastifySensible from '@fastify/sensible';
export async function registerSensible(app) {
    await app.register(fastifySensible, {
        sharedSchemaId: 'HttpError',
    });
}
//# sourceMappingURL=sensible.js.map