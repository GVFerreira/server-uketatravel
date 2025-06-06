import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { auth } from "@/http/middlewares/auth"
import { UnauthorizedError } from "../_errors/unauthorized-error"
import { storageProvider } from "@/services/storage/index"

function removeDomain(link: string) {
const url = new URL(link)
const relativePath = url.pathname.replace(/^\/website\//, '')

console.log(relativePath)
return relativePath
}

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

    const solicitation = await prisma.solicitation.findUnique({
      where: { id }
    })

    if(solicitation.passaportUrl || solicitation.profilePhotoUrl) {
      await storageProvider.delete(removeDomain(solicitation.passaportUrl))
      await storageProvider.delete(removeDomain(solicitation.profilePhotoUrl))
    }

    await prisma.solicitation.delete({
      where: { id }
    })

    return reply.status(200).send()
  })
}