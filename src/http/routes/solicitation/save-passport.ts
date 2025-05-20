import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { BadRequestError } from "../_errors/bad-request-error"

export async function savePassport(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/solicitation/save-passport', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Save passport URL image',
      body: z.object({
        solicitationId: z.string().uuid(),
        passportUrl: z.string()
      }),
      response: {
        201: z.object({
          solicitationId: z.string().uuid()
        })
      }
    }
  }, async (request, reply) => {
    const data = request.body

    const solicitationExists = await prisma.solicitation.findUnique({
      where: { id: data.solicitationId }
    })

    if(!solicitationExists) {
      throw new BadRequestError("Unexpected solicitation ID. It does not exist")
    }

    const solicitation = await prisma.solicitation.update({
      where: {
        id: data.solicitationId
      },
      data: {
        passaportUrl: data.passportUrl
      }
    })

    return reply.status(201).send({
      solicitationId: solicitation.id
    })
    
  })
}