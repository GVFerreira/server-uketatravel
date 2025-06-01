import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"

export async function getInfo(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/checkout/get-info', {
    schema: {
      tags: ['Checkout'],
      summary: 'Get checkout dynamic info.',
      response: {
        200: z.object({
          cotacaoCompra: z.number(),
          cotacaoVenda: z.number(),
          dataHoraCotacao: z.string()
        })
      }
    }
  }, async (_, reply) => {
    try {
      const dolar = await prisma.dolar.findUnique({
        where: {
          id: 'singleton'
        }
      })

      if(!dolar) {
        return reply.status(200).send({
          cotacaoCompra: 5.70,
          cotacaoVenda: 5.70,
          dataHoraCotacao: new Date().toISOString(),
        })
      }
  
      return reply.status(200).send({
        cotacaoCompra: dolar.buyQuote,
        cotacaoVenda: dolar.sellQuote,
        dataHoraCotacao: String(dolar.dateTimeQuote)
      })
    } catch (error) {
      console.error("Erro ao obter cotação do dólar:", error)
  
      return reply.status(200).send({
        cotacaoCompra: 5.70,
        cotacaoVenda: 5.70,
        dataHoraCotacao: new Date().toISOString(),
      })
    }
  })
}