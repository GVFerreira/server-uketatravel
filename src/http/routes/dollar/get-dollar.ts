import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from 'zod'

export async function getDollar(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/dollar', {
    schema: {
      tags: ['Dollar'],
      summary: 'Get current registered dollar.',
      response: {
        200: z.object({
          buyQuote: z.coerce.number(),
          ok: z.boolean()
        }),
        400: z.object({
          ok: z.boolean()
        })
      }
    }
  }, async (_, reply) => {
    
    const dollar = await prisma.dolar.findUnique({
      where: { id: 'singleton' }
    })

    if (!dollar) {
      return reply.status(400).send({ ok: false })
    }

    return reply.status(200).send({ buyQuote: dollar.buyQuote, ok: true })
  })
}