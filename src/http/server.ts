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

import { errorHandler } from './error-handler'

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

import { getInfo } from './routes/checkout/get-info'
import { cardPayment } from './routes/checkout/card-payment'
import { pixPayment } from './routes/checkout/pix-payment'
import { checkPixPayment } from './routes/checkout/check-pix-payment'
import { getPayments } from './routes/payment/get-payments'
import { getUsers } from './routes/user/get-users'

import dotenv from 'dotenv'
import { webhookAppmax } from './routes/checkout/webhook'
dotenv.config()


const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.setErrorHandler(errorHandler)

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'UK ETA Travel',
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

app.register(fastifyCors)

//User routes
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

//Payment Routes
app.register(getPayments)

//Checkout Routes
app.register(getInfo)
app.register(cardPayment)
app.register(pixPayment)
app.register(checkPixPayment)
app.register(webhookAppmax)

app.listen({ port: Number(process.env.PORT), host: "0.0.0.0" }).then(() => {
  console.log('HTTP server running!')
})