import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"

import { ImageAnnotatorClient } from "@google-cloud/vision"

export async function analyzePassport(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/solicitation/analyze-passport', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Analyze passport image.',
      body: z.object({
        imageBase64: z.string()
      }),
      response: {
        200: z.object({
          valid: z.boolean(),
          base64: z.string(),
          errors: z.array(z.string().optional())
        }),
        500: z.object({
          error_msg: z.string(),
          error: z.object({})
        })
      }
    },
    bodyLimit: 8 * 1024 * 1024
  }, async (request, reply) => {
    const { imageBase64 } = request.body

    const errors: string[] = []

    try {
      const client = new ImageAnnotatorClient()

      if (typeof client.objectLocalization !== 'function') {
        throw new Error('objectLocalization method is not available on ImageAnnotatorClient')
      }

      // Realiza a detecção de rótulos
      const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      const [labelResult] = await client.labelDetection({
        image: { content: buffer }
      })

      const labels = labelResult?.labelAnnotations || []

      // Validação de rótulos
      const mandatoryLabels = [
        'IDENTITY DOCUMENT', 'PASSPORT', 'DOCUMENT'
      ]

      if (!labels.some(label => {
        const desc = label.description?.toUpperCase() || ''
        return mandatoryLabels.some(keyword => desc.includes(keyword))
      })) {
        errors.push('A imagem deve conter um passaporte.')
      }

      // Verificar se a imagem é válida
      const isValid = errors.length === 0

      return reply.status(200).send({
        valid: isValid,
        base64: imageBase64,
        errors
      })
    } catch (error: any) {
      console.error('Error with Google Vision API:', error)
      return reply.status(500).send({
        error_msg: 'Error with Google Vision API:',
        error
      })
    }
  })
}