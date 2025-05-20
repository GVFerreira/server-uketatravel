import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from 'zod'

export async function requestPasswordRecover(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/password/recover', {
    schema: {
      tags: ['User'],
      summary: 'Request a password recover',
      body: z.object({
        email: z.string().email()
      }),
      response: {
        201: z.null()
      }
    }
  }, async (request, reply) => {
    const { email } = request.body

    const userFromEmail = await prisma.user.findUnique({
      where: { email }
    })

    if (!userFromEmail) {
      return reply.status(201).send()
    }

    const { id } = await prisma.token.create({
      data: {
        type: 'PASSWORD_RECOVER',
        userId: userFromEmail.id
      }
    })

    // Add system to send an e-mail with password recover link
    console.log(id)

    return reply.status(201).send()
  })
}