import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { auth } from "@/http/middlewares/auth"
import { UnauthorizedError } from "../_errors/unauthorized-error"

export async function updateStatus(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).put('/solicitation/update-status', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Update solicitation status and add file path',
      security: [
        { bearerAuth: [] }
      ],
      body: z.object({
        id: z.string().uuid(),
        status: z.string(),
        attachmentPath: z.string().optional()
      })
    }
  }, async (request, reply) => {
    const { id, status, attachmentPath } = request.body
    
    const userId = await request.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedError('User is not authenticated')
    }

    await prisma.solicitation.update({
      where: { id },
      data: {
        status,
        attachmentFileUrl: attachmentPath
      }
    })

    return reply.status(206).send()
  })
}