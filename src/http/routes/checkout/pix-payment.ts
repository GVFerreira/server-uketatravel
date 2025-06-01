import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { BadRequestError } from "../_errors/bad-request-error"
import type nodemailer from "nodemailer"
import NodeCache from "node-cache"

// Cache para armazenar a cotação do dólar por 6 horas (21600 segundos)
const dolarCache = new NodeCache({ stdTTL: 21600 })

type Dolar = {
  cotacaoCompra: number
  cotacaoVenda: number
  dataHoraCotacao: string
}

interface CustomMailOptions extends nodemailer.SendMailOptions {
  template?: string
  context?: { [key: string]: any }
}

// Função otimizada para obter cotação do dólar com cache e timeout
async function getDolar() {
  const CACHE_KEY = "dolar_cotacao"

  // Verifica se já existe no cache
  const cachedDolar = dolarCache.get<Dolar>(CACHE_KEY)
  if (cachedDolar) {
    return cachedDolar
  }

  const now = new Date()
  const brasiliaDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))

  const day = String(brasiliaDate.getDate() - 2).padStart(2, "0")
  const month = String(brasiliaDate.getMonth() + 1).padStart(2, "0")
  const year = brasiliaDate.getFullYear()
  const formattedDate = `${month}-${day}-${year}`

  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?$format=json&@dataCotacao='${formattedDate}'`

  try {
    // Adiciona timeout de 5 segundos para a requisição
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const reqDolar = await fetch(url, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const dolarResponse = await reqDolar.json()

    const dolar: Dolar = dolarResponse.value[0]

    // Armazena no cache
    dolarCache.set(CACHE_KEY, dolar)
    return dolar
  } catch (error) {
    console.error("Erro ao obter cotação do dólar:", error)

    // Em caso de erro, use um valor padrão ou a última cotação conhecida
    const defaultDolar: Dolar = {
      cotacaoCompra: 5.5, // Valor aproximado, ajuste conforme necessário
      cotacaoVenda: 5.5, // Valor aproximado, ajuste conforme necessário
      dataHoraCotacao: new Date().toISOString(),
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

function expiryDate() {
  let currentDate = new Date()
  currentDate.setHours(currentDate.getHours() + 12)
  return currentDate.toISOString().slice(0, 19).replace('T', ' ')
}

export async function pixPayment(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/checkout/pix-payment",
    {
      schema: {
        tags: ["Checkout"],
        summary: "Payments on PIX method must use this route",
        body: z.object({
          pixDetails: z.object({
            fullName: z.string(),
            cpfNumber: z.string(),
          }),
          solicitationId: z.string().uuid(),
        }),
        response: {
          // Schema de resposta omitido para brevidade
        },
      },
    },
    async (request, reply) => {
      const { pixDetails, solicitationId } = request.body

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
        const appmaxToken = "40216654-316062C0-FCAC9CF5-380CDBB9"
        const appmaxHeaders = { "Content-Type": "application/json" }
        const appmaxBaseUrl = "https://admin.appmax.com.br/api/v3"

        // Cria o cliente na Appmax
        const newCustomerResponse = await fetchWithTimeout(
          `${appmaxBaseUrl}/customer`,
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
          `${appmaxBaseUrl}/order`,
          {
            method: "POST",
            headers: appmaxHeaders,
            body: JSON.stringify({
              "access-token": appmaxToken,
              products: [{
                sku: "835103",
                name: "Assistência - UK ETA Vistos",
                qty: 1,
                price: 59.9 * dolar.cotacaoVenda,
                digital_product: 1,
              }],
              customer_id: customer.data.id,
            }),
          },
          5000, // 5 segundos de timeout
        )

        const order = await newOrderResponse.json()

        // Processa o pagamento na Appmax
        const newPaymentResponse = await fetchWithTimeout(
          `${appmaxBaseUrl}/payment/pix`,
          {
            method: "POST",
            headers: appmaxHeaders,
            body: JSON.stringify({
              "access-token": appmaxToken,
              cart: { order_id: order.data.id },
              customer: { customer_id: order.data.customer_id },
              payment: {
                'pix': {
                  'document_number': pixDetails.cpfNumber,
                  'expiration_date': expiryDate()
                }
              },
            }),
          },
          10000, // 10 segundos de timeout para processamento de pagamento
        )

        const pixPayment = await newPaymentResponse.json()

        // Prepara os dados para salvar no banco
        const paymentData = {
          idClient: `${customer.data.id}`,
          idOrder: `${order.data.id}`,
          transactionAmount: order.data.total,
          docNumber: pixDetails.cpfNumber,
          paymentTypeId: "pix",
        }

        if (pixPayment.success) {
          // Caso de pagamento aprovado
          try {
            const result = await prisma.$transaction(async (tx) => {
              const payment = await tx.payment.create({
                data: {
                  ...paymentData,
                  transactionId: pixPayment.data.pay_reference,
                  status: "Pagamento pendente",
                  docType: "CPF",
                  qrCode: pixPayment.data.pix_emv,
                  qrCodeBase64: pixPayment.data.pix_qrcode,
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
                  status: "Falha ao gerar Pix",
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
