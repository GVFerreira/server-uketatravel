import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import type nodemailer from "nodemailer"
import transporter from "@/utils/nodemailer"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

import dotenv from 'dotenv'
dotenv.config()


interface CustomMailOptions extends nodemailer.SendMailOptions {
  template?: string
  context?: { [key: string]: any }
}

// Função para enviar email de forma assíncrona sem bloquear a resposta
async function sendEmailAsync(mailOptions: CustomMailOptions) {
  try {
    const emailSent = await transporter.sendMail(mailOptions)
    if (emailSent.accepted) {
      console.log({
        to: emailSent.envelope.to,
        message: `Email sent successfully! Template: ${mailOptions.template}`,
        date: new Date().toLocaleString(),
      })
    } else {
      console.log({
        to: emailSent.envelope.to,
        message: `Email error! Template: ${mailOptions.template}`,
        date: new Date().toLocaleString(),
      })
    }
  } catch (error) {
    console.error("Erro ao enviar email:", error)
  }
}

async function getPayment(idOrder: string) {
  try {
    const payment = await prisma.payment.findFirst({
      where: {
        idOrder
      },
      include: {
        solicitations: {
          include: {
            solicitations: true
          }
        }
      }
    })
    return payment
  } catch (e) {
    console.log(e)
    return null
  }
}

async function updatePayment(data: { id: string, status: string }) {
  try {
    const updatedPayment = await prisma.payment.update({
      where: {
        id: data.id
      },
      data: {
        status: data.status
      }
    })
    return updatedPayment
  } catch (e) {
    console.log(e)
    return null
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
          environment: z.string(),
          event: z.enum(['OrderPaid', 'OrderPaidByPix', 'PaymentNotAuthorized | Reason: Não autorizado']),
          data: z.object({
            order_id: z.number(),
            order_status: z.enum(['aprovado', 'cancelado']),
            order_payment_type: z.enum(['CreditCard', 'Pix']),
            order_total: z.number()
          }),
        }),
        response: {
          // Schema de resposta omitido para brevidade
        },
      },
    },
    async (request, reply) => {
      const payload = request.body

      const payment = await getPayment(String(payload.data.order_id))

      if (!payment) {
        return reply.status(400)
      }

      if (payment.status === 'Aprovado') {
        return reply.status(200).send({ message: 'Payment already approved'})
      }

      if (payload.event === "OrderPaid" || payload.event === "OrderPaidByPix") {
        await updatePayment({ id: payment.id, status: "Aprovado"})

        const solicitations = payment.solicitations
        
        for (const solicitation of solicitations) {
          // Prepara o email, mas não espera o envio para responder
          const mailOptions: CustomMailOptions = {
            from: `UK ETA Vistos <${process.env.SMTP_USER}>`,
            to: solicitation.solicitations.email,
            subject: "Pagamento aprovado",
            template: "pagamento-aprovado",
          }

          const adminMailOptions: CustomMailOptions = {
            from: `UK ETA Vistos <${process.env.SMTP_USER}>`,
            to: process.env.RECIPIENT_EMAIL,
            subject: `Nova solicitação de ETA - Pedido: #${payment.idOrder}`,
            template: "aviso-eta",
            context: {
              ...solicitation.solicitations,
              dateOfBirth: new Date(solicitation.solicitations.dateOfBirth).toLocaleDateString('pt-br'),
              passportExpiryDate: new Date(solicitation.solicitations.passportExpiryDate).toLocaleDateString('pt-br'),
              whichSituationWasInvolvedIn: JSON.parse(solicitation.solicitations.whichSituationWasInvolvedIn)
            },
            attachments: [
              {
                filename: `${solicitation.solicitations.name}-${solicitation.solicitations.surname}-passporte.jpg`,
                path: solicitation.solicitations.passaportUrl
              },
              {
                filename: `${solicitation.solicitations.name}-${solicitation.solicitations.surname}-foto.jpg`,
                path: solicitation.solicitations.profilePhotoUrl
              }
            ]
          }

          sendEmailAsync(mailOptions)
          sendEmailAsync(adminMailOptions)
        }
      } else if (payload.event === "PaymentNotAuthorized | Reason: Não autorizado") {
        await updatePayment({ id: payment.id, status: "Negado"})

        const solicitations = payment.solicitations
        
        for (const solicitation of solicitations) {
          // Prepara o email, mas não espera o envio para responder
          const mailOptions: CustomMailOptions = {
            from: `UK ETA Vistos <${process.env.SMTP_USER}>`,
            to: solicitation.solicitations.email,
            subject: "Pagamento recusado",
            template: "pagamento-recusado",
          }

          // Envia o email de forma assíncrona
          sendEmailAsync(mailOptions)
        }
      }

      return reply.status(201).send({message: 'Payment has been updated successfully'})
      
  })
}
