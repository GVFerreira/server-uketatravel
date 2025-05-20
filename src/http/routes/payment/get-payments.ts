import { auth } from "@/http/middlewares/auth"
import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { UnauthorizedError } from "../_errors/unauthorized-error"

export async function getPayments(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/payments',
      {
        schema: {
          tags: ['Payments'],
          summary: 'Get all payments',
          security: [{ bearerAuth: [] }],
          response: {
            200: z.array(z.object({
                id: z.string().uuid(),
                idClient: z.string(),
                idOrder: z.string(),
                transactionAmount: z.number(),
                transactionId: z.string(),
                docType: z.string().default("CPF"),
                docNumber: z.string(),
                status: z.string(),
                paymentTypeId: z.string(),
                qrCode: z.string().nullable(),
                qrCodeBase64: z.string().nullable(),
                createdAt: z.coerce.date().default(new Date()),
                solicitations: z.array(z.object({
                  solicitations: z.object({
                    name: z.string(),
                    surname: z.string()
                  })
                }))
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

        const payments = await prisma.payment.findMany({
          include: {
            solicitations: {
              include: {
                solicitations: {
                  select: {
                    name: true,
                    surname: true,
                  }
                }
              }
            }
          }
        })

        return payments 
      }
    )
}