import { prisma } from '@/lib/prisma'
import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

function isEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(input)
}

export async function solicitationPublicInfo(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/solicitation/public-info', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Get public data of one specific solicitation',
      body: z.object({
        query: z.string()
      })
      // response: {
      //   200: z.object({
      //     cotacaoCompra: z.number(),
      //     cotacaoVenda: z.number(),
      //     dataHoraCotacao: z.string()
      //   })
      // }
    }
  }, async (request, reply) => {
    const { query } = request.body

    // Verifica se o input é um email ou passaporte
    const isEmailQuery = isEmail(query)

    // Consulta no banco de dados
    const solicitation = await prisma.solicitation.findFirst({
      where: isEmailQuery ? { email: query.toLowerCase() } : { passportNumber: query.toUpperCase() },
      select: {
        name: true,
        surname: true,
        email: true,
        passportNumber: true,
        status: true,
        updatedAt: true,
        createdAt: true,
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
      },
    })

    if (!solicitation) {
      return reply.status(200).send({
        message: "A solicitation that contains this information does not exist."
      })
    }
   
    return reply.status(200).send(solicitation)
  })
}