import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from 'zod'
import type nodemailer from "nodemailer"
import transporter from "@/utils/nodemailer"

interface CustomMailOptions extends nodemailer.SendMailOptions {
  template?: string
  context?: { [key: string]: any }
}

async function sendEmailAsync(mailOptions: CustomMailOptions) {
  try {
    const emailSent = await transporter.sendMail(mailOptions)
    if (emailSent.accepted) {
      console.log({
        to: mailOptions.to,
        message: `Email sent successfully! Template: ${mailOptions.template}`,
        date: new Date().toLocaleString(),
      })
    } else {
      console.log({
        to: mailOptions.to,
        message: `Email error! Template: ${mailOptions.template}`,
        date: new Date().toLocaleString(),
      })
    }
  } catch (error) {
    console.error("Erro ao enviar email:", error)
  }
}

export async function formContact(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/form-contact', {
    schema: {
      summary: 'It receives a contact form details and send via email to admin',
      body: z.object({
        name: z.string(),
        surname: z.string(),
        email: z.string().email(),
        subject: z.string(),
        message: z.string()
      }),
      response: {
        200: z.object({
          status: z.boolean()
        })
      }
    }
  }, async (request, reply) => {
    const { name, surname, email, subject, message } = request.body

    const mailOptions: CustomMailOptions = {
      from: `UK ETA Vistos <${process.env.SMTP_USER}>`,
      to: process.env.RECIPIENT_EMAIL,
      subject: "Formulário de contato",
      template: "contato",
      context: {
        name,
        surname,
        email,
        subject,
        message
      }
    }

    const sending = sendEmailAsync(mailOptions)

    if(!sending) {
      return reply.status(200).send({ status: false })
    }

    return reply.status(200).send({ status: true })
  })
}