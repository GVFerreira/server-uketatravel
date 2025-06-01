import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from 'zod'

export async function updateDollar(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/dollar', {
    schema: {
      tags: ['Dollar'],
      summary: 'Update dollar exchange rate.',
      body: z.object({
        buyQuote: z.coerce.number()
      }),
      response: {
        200: z.object({
          ok: z.boolean()
        }),
        400: z.object({
          ok: z.boolean()
        })
      }
    }
  }, async (request, reply) => {
    const { buyQuote } = request.body
    
    const dollar = await prisma.dolar.update({
      where: { id: 'singleton' },
      data: {
        buyQuote,
        dateTimeQuote: new Date()
      }
    })

    if (!dollar) {
      return reply.status(400).send({ ok: false })
    }

    return reply.status(200).send({ ok: true })
  })
}