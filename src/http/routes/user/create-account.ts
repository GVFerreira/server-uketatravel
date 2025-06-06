import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from 'zod'

export async function createAccount(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/users', {
    schema: {
      tags: ['User'],
      summary: 'Create a new account',
      body: z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(8)
      })
    }
  }, async (request, reply) => {
    const { name, email, password } = request.body

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