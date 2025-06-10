import fastifyCors from '@fastify/cors'
import fastifyJWT from '@fastify/jwt'
import fastifySwaggerUI from '@fastify/swagger-ui'
import fastifySwagger from '@fastify/swagger'
import { fastify } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider
} from 'fastify-type-provider-zod'
import { prisma } from '@/lib/prisma'

import { formContact } from './form-contact'

import { getUsers } from './routes/user/get-users'
import { authenticateWithPassword } from './routes/user/authenticate-with-password'
import { requestPasswordRecover } from './routes/user/request-password-recover'
import { resetPassword } from './routes/user/reset-password'
import { createAccount } from './routes/user/create-account'
import { getProfile } from './routes/user/get-profile'

import { saveDetails } from './routes/solicitation/save-details'
import { saveQuestions } from './routes/solicitation/save-questions'
import { analyzePassport } from './routes/solicitation/analyze-passport'
import { savePassport } from './routes/solicitation/save-passport'
import { savePhoto } from './routes/solicitation/save-photo'
import { analyzePhoto } from './routes/solicitation/analyze-photo'
import { solicitationPublicInfo } from './routes/solicitation/solicitation-public-info'
import { getSolicitations } from './routes/solicitation/get-solicitations'
import { getSolicitation } from './routes/solicitation/get-solicitation'
import { updateEmail } from './routes/solicitation/update-email'
import { updateStatus } from './routes/solicitation/update-status'
import { deleteSolicitation } from './routes/solicitation/delete-solicitation'

import { getInfo } from './routes/checkout/get-info'
import { cardPayment } from './routes/checkout/card-payment'
import { pixPayment } from './routes/checkout/pix-payment'
import { checkPixPayment } from './routes/checkout/check-pix-payment'
import { webhookAppmax } from './routes/checkout/webhook'

import { getPayments } from './routes/payment/get-payments'

import { getDollar } from './routes/dollar/get-dollar'
import { updateDollar } from './routes/dollar/update-dollar'

import { errorHandler } from './error-handler'

import cron from 'node-cron'

import dotenv from 'dotenv'
dotenv.config()

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.setErrorHandler(errorHandler)

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'UK ETA Vistos',
      description: 'Full-stack SaaS app',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUI, {
  routePrefix: '/docs',
})

app.register(fastifyJWT, {
  secret: process.env.JWT_SECRET
})

app.register(fastifyCors, {
  origin: [String(process.env.NEXT_PUBLIC_APP_URL)],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
})

// General Routes
app.register(formContact)

//User Routes
app.register(createAccount)
app.register(authenticateWithPassword)
app.register(getProfile)
app.register(requestPasswordRecover)
app.register(resetPassword)
app.register(getUsers)

//Solicitation Routes
app.register(getSolicitation)
app.register(getSolicitations)
app.register(saveDetails)
app.register(saveQuestions)
app.register(savePassport)
app.register(analyzePassport)
app.register(savePhoto)
app.register(analyzePhoto)
app.register(solicitationPublicInfo)
app.register(updateEmail)
app.register(updateStatus)
app.register(deleteSolicitation)

//Payment Routes
app.register(getPayments)

//Checkout Routes
app.register(getInfo)
app.register(cardPayment)
app.register(pixPayment)
app.register(checkPixPayment)
app.register(webhookAppmax)

//Dollar Routes
app.register(getDollar)
app.register(updateDollar)

interface GetDolarResponse {
  value: Dolar[]
}

type Dolar = {
  cotacaoCompra: number
  cotacaoVenda: number
  dataHoraCotacao: string
}

cron.schedule('0 6,18 * * *', async () => {
  try {
    const now = new Date()
    const brasiliaDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
  
    const day = String(brasiliaDate.getDate()).padStart(2, "0")
    const month = String(brasiliaDate.getMonth() + 1).padStart(2, "0")
    const year = brasiliaDate.getFullYear()
    const formattedDate = `${month}-${day}-${year}`
  
    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?$format=json&@dataCotacao='${formattedDate}'`
  
    const reqDolar = await fetch(url)
    const dolarResponse = await reqDolar.json() as GetDolarResponse
    const dolar: Dolar = dolarResponse.value[0]

    if(dolar) {
      await prisma.dolar.upsert({
        where: { id: 'singleton' },
        create: {
          id: 'singleton',
          buyQuote: dolar.cotacaoCompra,
          sellQuote: dolar.cotacaoVenda,
          dateTimeQuote: new Date(dolar.dataHoraCotacao),
        },
        update: {
          buyQuote: dolar.cotacaoCompra,
          sellQuote: dolar.cotacaoVenda,
          dateTimeQuote: new Date(dolar.dataHoraCotacao),
        }
      })

      console.log('Dolar salvo com sucesso!')
    }

  } catch (err) {
    console.error('Erro ao executar tarefa agendada:', err)
  }
})

import fastifyMultipart from 'fastify-multipart'
app.register(fastifyMultipart)

app.listen({ port: Number(process.env.PORT), host: "0.0.0.0" }).then(() => {
  console.log('HTTP server running!')
})