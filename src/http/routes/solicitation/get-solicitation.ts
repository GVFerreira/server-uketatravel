import { auth } from "@/http/middlewares/auth"
import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { UnauthorizedError } from "../_errors/unauthorized-error"
import { BadRequestError } from "../_errors/bad-request-error"

export async function getSolicitation(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/solicitation',
      {
        schema: {
          tags: ['Solicitation'],
          summary: 'Get a specific solicitation by ID',
          security: [{ bearerAuth: [] }],
          body: z.object({
            solicitationId: z.string().uuid()
          }),
          response: {
            200: z.object({
              id: z.string().uuid(),
              name: z.string(),
              surname: z.string(),
              dateOfBirth: z.string(),
              passportNumber: z.string(),
              passportExpiryDate: z.string(),
              nationality: z.string(),
              passportCountryOfIssue: z.string(),
              phone: z.string(),
              email: z.string().email(),
              address: z.string(),
              city: z.string(),
              zipCode: z.string(),
              country: z.string(),
            
              otherNationality: z.string().nullable(),
              occupation: z.string().nullable(),
              hasCriminalConviction: z.boolean().nullable(),
              hasCriminalConvictionLastYear: z.boolean().nullable(),
              crimeHasBeenConvicted: z.string().nullable(),
              countryCrimeHasBeenConvicted: z.string().nullable(),
              convictedMoreThanOneYear: z.boolean().nullable(),
              hasEverConvictedMoreThanOneYear: z.boolean().nullable(),
              crimeConvictedMoreThanOneYear: z.string().nullable(),
              countryConvictedMoreThanOneYear: z.string().nullable(),
              initialDateConvictedMoreThanOneYear: z.string().nullable(),
              endDateConvictedMoreThanOneYear: z.string().nullable(),
              whichSituationWasInvolvedIn: z.string().nullable(),
            
              passaportUrl: z.string().nullable(),
              profilePhotoUrl: z.string().nullable(),
            
              status: z.string().nullable(),
              createdAt: z.coerce.date().default(new Date()),
              updatedAt: z.coerce.date(),
              payment: z.array(z.object({
                payment: z.object({
                  id: z.string(),
                  idClient: z.string(),
                  idOrder: z.string(),
                  status: z.string(),
                  transactionAmount: z.number(),
                  transactionId: z.string(),
                  docType: z.string(),
                  docNumber: z.string(),
                  paymentTypeId: z.string(),
                  qrCode: z.string().nullable(),
                  qrCodeBase64: z.string().nullable(),
                  createdAt: z.coerce.date()
                })
              }))
            })
          }
        }
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { solicitationId } = request.body

        if (!userId) {
          throw new UnauthorizedError('User is not authenticated')
        }

        const solicitation = await prisma.solicitation.findUnique({
          where: {
            id: solicitationId
          },
          include: {
            payment: {
              include: {
                payment: true
              }
            }
          }
          
        })

        if (!solicitation) {
          throw new BadRequestError('This solicitation does not exist.')
        }

        return reply.status(200).send(solicitation)
      }
    )
}