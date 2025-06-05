import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { auth } from "@/http/middlewares/auth"
import { UnauthorizedError } from "../_errors/unauthorized-error"

export async function deleteSolicitation(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).delete('/solicitation/delete', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Delete a solicitation',
      security: [
        { bearerAuth: [] }
      ],
      body: z.object({
        id: z.string().uuid()
      })
    }
  }, async (request, reply) => {
    const { id } = request.body
    
    const userId = await request.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedError('User is not authenticated')
    }

    await prisma.solicitation.delete({
      where: { id }
    })

    return reply.status(200).send()
  })
}