import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export async function saveDetails(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/solicitation/save-details', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Save personal details of a solicitation ',
      body: z.object({
        name: z.string().min(2).toLowerCase(),
        surname: z.string().min(2).toLowerCase(),
        dateOfBirth: z.string(),
        passportNumber: z.string().max(9).toUpperCase(),
        passportExpiryDate: z.string(),
        nationality: z.string(),
        passportCountryOfIssue: z.string(),
        phone: z.string(),
        email: z.string().email().toLowerCase(),
        address: z.string(),
        city: z.string(),
        zipCode: z.string(),
        country: z.string()
      }),
      response: {
        201: z.object({
          solicitationId: z.string().uuid()
        })
      }
    }
  }, async (request, reply) => {
    const data = request.body

    const solicitation = await prisma.solicitation.create({
      data
    })

    return reply.status(201).send({
      solicitationId: solicitation.id
    })
    
  })
}