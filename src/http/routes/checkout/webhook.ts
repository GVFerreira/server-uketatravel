import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import type nodemailer from "nodemailer"
import transporter from "@/utils/nodemailer"


interface CustomMailOptions extends nodemailer.SendMailOptions {
  template?: string
  context?: { [key: string]: any }
}

// Função auxiliar para fazer requisições com timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Função para enviar email de forma assíncrona sem bloquear a resposta
async function sendEmailAsync(mailOptions: CustomMailOptions, solicitation: any) {
  try {
    const emailSent = await transporter.sendMail(mailOptions)
    if (emailSent.accepted) {
      console.log({
        to: solicitation.email,
        message: `Email sent successfully! Template: ${mailOptions.template}`,
        date: new Date().toLocaleString(),
      })
    } else {
      console.log({
        to: solicitation.email,
        message: `Email error! Template: ${mailOptions.template}`,
        date: new Date().toLocaleString(),
      })
    }
  } catch (error) {
    console.error("Erro ao enviar email:", error)
  }
}

export async function webhookAppmax(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/webhook-appmax",
    {
      schema: {
        tags: ["Checkout"],
        summary: "Webhook that receives information from Appmax",
        body: z.object({
          "environment": z.string(),
          "event": z.enum(['OrderPaid', 'PaymentNotAuthorized | Reason: Autorizacao negada']),
          "data": z.object({
            "order_id": z.number(),
            "order_status": z.enum(['aprovado', 'cancelado']),
            "order_total": z.string()
          }),
        }),
        response: {
          // Schema de resposta omitido para brevidade
        },
      },
    },
    async (request, reply) => {
      const payload = request.body
      console.log(payload)

      return reply.status(200).send({ ok: true })
      
  })
}
