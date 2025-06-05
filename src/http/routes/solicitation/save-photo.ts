import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { BadRequestError } from "../_errors/bad-request-error"
import { PassThrough } from 'stream'
import { v4 as uuidv4 } from 'uuid'
import { storageProvider } from "@/services/storage/index"

export async function savePhoto(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/solicitation/save-photo', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Save photo URL image',
      body: z.object({
        solicitationId: z.string().uuid(),
        imageBase64: z.string()
      }),
      response: {
        201: z.object({
          solicitationId: z.string().uuid()
        })
      }
    }
  }, async (request, reply) => {
    const { solicitationId, imageBase64 } = request.body

    const solicitationExists = await prisma.solicitation.findUnique({
      where: { id: solicitationId }
    })

    if(!solicitationExists) {
      throw new BadRequestError("Unexpected solicitation ID. It does not exist")
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    const stream = new PassThrough()
    stream.end(buffer)

    const filename = `${uuidv4()}.jpg`

    const imageUrl = await storageProvider.upload({
      file: stream,
      filename,
      mimetype: 'image/jpeg'
    }, 'photo-uploads')

    const solicitation = await prisma.solicitation.update({
      where: {
        id: solicitationId
      },
      data: {
        profilePhotoUrl: imageUrl
      }
    })

    return reply.status(201).send({
      solicitationId: solicitation.id
    })
    
  })
}