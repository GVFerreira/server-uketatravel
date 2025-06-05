import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from 'zod'
import { auth } from "@/http/middlewares/auth"
import { UnauthorizedError } from "../_errors/unauthorized-error"

export async function createAccount(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).post('/users', {
    schema: {
      tags: ['User'],
      summary: 'Create a new account',
      security: [
        { bearerAuth: [] }
      ],
      body: z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(8)
      })
    }
  }, async (request, reply) => {
    const { name, email, password } = request.body

    const userId = await request.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedError('User is not authenticated')
    }

    const userWithSameEmail = await prisma.user.findUnique({
      where: { email }
    })

    if (userWithSameEmail) {
      return reply.status(200).send({ status: 200, message: 'User with same e-mail already exists' })
    }

    const passwordHash = await hash(password, 8)

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash
      }
    })

    return reply.status(201).send({status: 201, message: 'User created successfully'})
  })
}