import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { UnauthorizedError } from "../_errors/unauthorized-error"
import { auth } from "@/http/middlewares/auth"

export async function updateEmail(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).put('/solicitation/update-email', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Update client e-mail',
      security: [
        { bearerAuth: [] }
      ],
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

    const userId = await request.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedError('User is not authenticated')
    }

    const solicitation = await prisma.solicitation.update({
      where: { id },
      data: { email }
    })

    return reply.status(201).send({
      solicitationId: solicitation.id
    })
  })
}