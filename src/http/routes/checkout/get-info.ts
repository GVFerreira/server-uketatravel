import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import NodeCache from "node-cache"
import { z } from "zod"

type Dolar = {
  cotacaoCompra: number
  cotacaoVenda: number
  dataHoraCotacao: string
}

const dolarCache = new NodeCache({ stdTTL: 21600 })

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
    const CACHE_KEY = "dolar_cotacao"

    // Verifica se já existe no cache
    const cachedDolar = dolarCache.get<Dolar>(CACHE_KEY)
    console.log(cachedDolar)
    if (cachedDolar) {
      return reply.status(200).send(cachedDolar)
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
      return reply.status(200).send(dolar)
    } catch (error) {
      console.error("Erro ao obter cotação do dólar:", error)

      // Em caso de erro, use um valor padrão ou a última cotação conhecida
      const defaultDolar: Dolar = {
        cotacaoCompra: 5.5, // Valor aproximado, ajuste conforme necessário
        cotacaoVenda: 5.5, // Valor aproximado, ajuste conforme necessário
        dataHoraCotacao: new Date().toISOString(),
      }

      return reply.status(200).send(defaultDolar)
    }
  })
}