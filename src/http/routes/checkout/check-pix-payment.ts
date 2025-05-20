import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { BadRequestError } from "../_errors/bad-request-error"

export async function checkPixPayment(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/checkout/check-pix-payment', {
    schema: {
      tags: ['Checkout'],
      summary: 'Verify if a PIX payment has been done.',
      body: z.object({
        paymentId: z.string().uuid()
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
    const { paymentId } = request.body

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    })

    if (!payment) {
      throw new BadRequestError('This payment does not exist')
    }
   
    return reply.status(200).send(payment)
  })
}