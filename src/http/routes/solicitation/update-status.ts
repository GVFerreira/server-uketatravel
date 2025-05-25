import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"

export async function updateStatus(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().put('/solicitation/update-status', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Update solicitation status and add file path',
      body: z.object({
        id: z.string().uuid(),
        status: z.string(),
        attachmentPath: z.string()
      })
    }
  }, async (request, reply) => {
    const { id, status, attachmentPath } = request.body

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