import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export async function updateEmail(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().put('/solicitation/update-email', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Update client e-mail',
      body: z.object({
        id: z.string().uuid(),
        email: z.string().email().toLowerCase(),
      }),
      response: {
        201: z.object({
          solicitationId: z.string().uuid()
        })
      }
    }
  }, async (request, reply) => {
    const { id, email } = request.body

    const solicitation = await prisma.solicitation.update({
      where: { id },
      data: { email }
    })

    return reply.status(201).send({
      solicitationId: solicitation.id
    })
  })
}