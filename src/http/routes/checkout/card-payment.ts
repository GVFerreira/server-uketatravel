import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { BadRequestError } from "../_errors/bad-request-error"
import type nodemailer from "nodemailer"
import transporter from "@/utils/nodemailer"

interface CustomMailOptions extends nodemailer.SendMailOptions {
  template?: string
  context?: { [key: string]: any }
}

async function getDolar() {
  try {
    const dolar = await prisma.dolar.findUnique({
      where: {
        id: 'singleton'
      }
    })

    return dolar
  } catch (error) {
    console.error("Erro ao obter cotação do dólar:", error)

    // Em caso de erro, use um valor padrão ou a última cotação conhecida
    const defaultDolar = {
      buyQuote: 5.70,
      sellQuote: 5.70,
      dateTimeQuote: new Date().toISOString(),
    }

    return defaultDolar
  }
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

export async function cardPayment(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/checkout/card-payment",
    {
      schema: {
        tags: ["Checkout"],
        summary: "Payments on card must use this route",
        body: z.object({
          cardDetails: z.object({
            cardNumber: z.string(),
            cardHolderName: z.string(),
            CVV: z.string(),
            cpfNumber: z.string(),
            expiryMonth: z.string(),
            expiryYear: z.string(),
          }),
          solicitationId: z.string().uuid(),
        }),
        response: {
          // Schema de resposta omitido para brevidade
        },
      },
    },
    async (request, reply) => {
      const { cardDetails, solicitationId } = request.body

      // Busca a solicitação e a cotação do dólar em paralelo
      const [solicitation, dolar] = await Promise.all([
        prisma.solicitation.findUnique({
          where: { id: solicitationId },
        }),
        getDolar(),
      ])

      if (!solicitation) {
        throw new BadRequestError("Unexpected solicitation ID. It does not exist")
      }

      try {
        // Configurações para todas as requisições à API Appmax
        const appmaxToken = process.env.APPMAX_KEY
        const appmaxHeaders = { "Content-Type": "application/json" }

        // Cria o cliente na Appmax
        const newCustomerResponse = await fetchWithTimeout(
          `${process.env.APPMAX_BASEURL}/customer`,
          {
            method: "POST",
            headers: appmaxHeaders,
            body: JSON.stringify({
              "access-token": appmaxToken,
              firstname: solicitation.name,
              lastname: solicitation.surname,
              email: solicitation.email,
              telephone: solicitation.phone,
              ip: request.ip || "",
            }),
          },
          5000, // 5 segundos de timeout
        )

        const customer = await newCustomerResponse.json()
        if (!customer.success) {
          throw new BadRequestError("Error when trying to create a customer in Appmax")
        }

        // Cria o pedido na Appmax
        const newOrderResponse = await fetchWithTimeout(
          `${process.env.APPMAX_BASEURL}/order`,
          {
            method: "POST",
            headers: appmaxHeaders,
            body: JSON.stringify({
              "access-token": appmaxToken,
              products: [
                {
                  sku: "835103",
                  name: "Assistência - UK ETA Vistos",
                  qty: 1,
                  price: 59.9 * dolar.buyQuote,
                  digital_product: 1,
                },
              ],
              customer_id: customer.data.id,
            }),
          },
          5000, // 5 segundos de timeout
        )

        const order = await newOrderResponse.json()

        // Processa o pagamento na Appmax
        const newPaymentResponse = await fetchWithTimeout(
          `${process.env.APPMAX_BASEURL}/payment/credit-card`,
          {
            method: "POST",
            headers: appmaxHeaders,
            body: JSON.stringify({
              "access-token": appmaxToken,
              cart: { order_id: order.data.id },
              customer: { customer_id: order.data.customer_id },
              payment: {
                CreditCard: {
                  number: cardDetails.cardNumber.replace(/\s/g, ""),
                  cvv: cardDetails.CVV,
                  month: Number.parseInt(cardDetails.expiryMonth),
                  year: Number.parseInt(cardDetails.expiryYear.slice(-2)),
                  document_number: cardDetails.cpfNumber,
                  name: cardDetails.cardHolderName,
                  installments: 1,
                  soft_descriptor: "UKETAVISTOS",
                },
              },
            }),
          },
          10000, // 10 segundos de timeout para processamento de pagamento
        )

        const cardPayment = await newPaymentResponse.json()

        // Prepara os dados para salvar no banco
        const paymentData = {
          idClient: `${customer.data.id}`,
          idOrder: `${order.data.id}`,
          transactionAmount: order.data.total,
          docNumber: cardDetails.cpfNumber,
          paymentTypeId: "credit_card",
        }

        if (cardPayment.success) {
          // Caso de pagamento aprovado
          try {
            const result = await prisma.$transaction(async (tx) => {
              const payment = await tx.payment.create({
                data: {
                  ...paymentData,
                  transactionId: cardPayment.data.pay_reference,
                  status: "Aprovado",
                  docType: "CPF",
                },
              })

              const solicitationPayment = await tx.solicitationPayment.create({
                data: {
                  paymentId: payment.id,
                  solicitationsId: solicitation.id,
                },
              })

              return { payment, solicitationPayment }
            })

            // Prepara o email, mas não espera o envio para responder
            const mailOptions: CustomMailOptions = {
              from: `UK ETA Vistos <${process.env.SMTP_USER}>`,
              to: solicitation.email,
              subject: "Pagamento aprovado",
              template: "pagamento-aprovado",
            }

            // Envia o email de forma assíncrona
            sendEmailAsync(mailOptions, solicitation)

            return reply.status(201).send(result.payment)
          } catch (e) {
            console.error(e)
            return reply.status(500).send(e)
          }
        } else {
          // Caso de pagamento negado
          try {
            const result = await prisma.$transaction(async (tx) => {
              const payment = await tx.payment.create({
                data: {
                  ...paymentData,
                  transactionId: "",
                  status: "Negado",
                },
              })

              const solicitationPayment = await tx.solicitationPayment.create({
                data: {
                  paymentId: payment.id,
                  solicitationsId: solicitation.id,
                },
              })

              return { payment, solicitationPayment }
            })

            // Prepara o email, mas não espera o envio para responder
            const mailOptions: CustomMailOptions = {
              from: `UK ETA Vistos <${process.env.SMTP_USER}>`,
              to: solicitation.email,
              subject: "Pagamento recusado",
              template: "pagamento-recusado",
            }

            // Envia o email de forma assíncrona
            sendEmailAsync(mailOptions, solicitation)

            return reply.status(201).send(result.payment)
          } catch (e) {
            console.error(e)
            return reply.status(500).send(e)
          }
        }
      } catch (e) {
        console.error(e)
        return reply.status(500).send(e)
      }
    },
  )
}
