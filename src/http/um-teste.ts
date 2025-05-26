
import type { FastifyInstance } from "fastify"


export async function umTeste(app:FastifyInstance) {
  app.post('/test', async (request, reply) => {
    return reply.status(201).send({ ok: true })
  })
}
