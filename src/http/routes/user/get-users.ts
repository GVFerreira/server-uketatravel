import { auth } from "@/http/middlewares/auth"
import { prisma } from "@/lib/prisma"
import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"

export async function getUsers(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/get-users',
      {
        schema: {
          tags: ['User'],
          summary: 'Get all users',
          security: [{ bearerAuth: [] }],
          response: {
            200: z.array(z.object({
                id: z.string().uuid(),
                name: z.string().nullable(),
                email: z.string().email(),
                avatarUrl: z.string().nullable(),
                createdAt: z.coerce.date(),
                updatedAt: z.coerce.date(),
              })
            )
          }
        }
      },
      async (request) => {
        // const userId = await request.getCurrentUserId()

        // if (!userId) {
        //   throw new UnauthorizedError('User is not authenticated')
        // }

        const users = await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
            updatedAt: true
          }
        })

        return users 
      }
    )
}