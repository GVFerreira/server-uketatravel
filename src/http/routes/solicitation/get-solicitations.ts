import { auth } from "@/http/middlewares/auth"
import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { UnauthorizedError } from "../_errors/unauthorized-error"

export async function getSolicitations(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/solicitations',
      {
        schema: {
          tags: ['Solicitation'],
          summary: 'Get all solicitation',
          security: [{ bearerAuth: [] }],
          response: {
            200: z.array(z.object({
                id: z.string().uuid(),
                name: z.string(),
                surname: z.string(),
                passportNumber: z.string(),
                phone: z.string(),
                email: z.string().email(),
                profilePhotoUrl: z.string().nullable(),
                status: z.string().nullable(),
                createdAt: z.coerce.date(),
                updatedAt: z.coerce.date(),
                payment: z.array(z.object({
                  payment: z.object({
                      status: z.string(),
                      createdAt: z.coerce.date(),
                      transactionAmount: z.number(),
                      paymentTypeId: z.string(),
                    })
                  })
                )
              })
            )
          }
        }
      },
      async (request) => {
        const userId = await request.getCurrentUserId()

        if (!userId) {
          throw new UnauthorizedError('User is not authenticated')
        }

        const solicitations = await prisma.solicitation.findMany({
          select: {
            id: true,
            name: true,
            surname: true,
            passportNumber: true,
            phone: true,
            email: true,
            profilePhotoUrl: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            payment: {
              include: {
                payment: {
                  select: {
                    paymentTypeId: true,
                    status: true,
                    transactionAmount: true,
                    createdAt: true,
                  }
                }
              },
            }
          }
        })

        return solicitations 
      }
    )
}