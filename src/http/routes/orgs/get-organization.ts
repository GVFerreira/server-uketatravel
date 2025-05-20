import { auth } from "@/http/middlewares/auth"
import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"

export async function getOrganization(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/organization/:slug',
      {
        schema: {
          tags: ['Organization'],
          summary: 'Get organization details',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string()
          }),
          response: {
            200: z.object({
              organization: z.object({
                id: z.string().uuid(),
                name: z.string(),
                slug: z.string(),
                avatarUrl: z.string().url().nullable(),
                ownerId: z.string().uuid(),
                createdAt: z.date(),
                updatedAt: z.date(),
              })
            })
          }
        }
      },
      async (request, reply) => {
        const { slug } = request.params
        const { organization } = await request.getUserMembership(slug)

        return { organization }
      }
    )
}