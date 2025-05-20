import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/http/middlewares/auth"
import { organizationSchema } from "@saas/auth"
import { getUserPermissions } from "@/utils/get-user-permissions"
import { UnauthorizedError } from "../_errors/unauthorized-error"

export async function updateOrganization(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).put('/organization/:slug', {
    schema: {
      tags: ['Organization'],
      summary: 'Update organization details',
      security: [{ bearerAuth: [] }],
      body: z.object({
        name: z.string()
      }),
      params: z.object({
        slug: z.string()
      }),
      response: {
        204: z.null()
      }
    }
  }, async (request, reply) => {
    const { slug } = request.params
    const { name } = request.body

    const userId = await request.getCurrentUserId()
    const { membership, organization } = await request.getUserMembership(slug)

    const authOrganization = organizationSchema.parse(organization)
    
    const { cannot } = getUserPermissions(userId, membership.role)
    
    if (cannot('update', authOrganization)) {
      throw new UnauthorizedError("You're not allowed to update this organization")
    }

    await prisma.organization.update({
      where: {
        id: organization.id
      },
      data: {
        name
      }
    })
    
    return reply.status(204).send()
  })
}