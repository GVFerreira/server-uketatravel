import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/http/middlewares/auth"
import { createSlug } from "@/utils/create-slug"
import { BadRequestError } from "../_errors/bad-request-error"

export async function createOrganization(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).post('/organization', {
    schema: {
      tags: ['Organization'],
      summary: 'Create new organization',
      security: [{ bearerAuth: [] }],
      body: z.object({
        name: z.string()
      }),
      response: {
        201: z.object({
          organizationId: z.string().uuid()
        })
      }
    }
  }, async (request, reply) => {
    const userId = await request.getCurrentUserId()
    const { name } = request.body
    const slug = createSlug(name)

    const slugAlredyExists = await prisma.organization.findUnique({
      where: { slug }
    })

    if (slugAlredyExists) {
      throw new BadRequestError('Another organization with same name already exists')
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'ADMIN'
          }
        }
      }
    })

    return reply.status(201).send({
      organizationId: organization.id
    })
    
  })
}