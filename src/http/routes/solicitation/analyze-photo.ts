import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"

import { ImageAnnotatorClient } from "@google-cloud/vision"

function rgbToLuminance(r: number, g: number, b: number): number {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  return 0.2126 * (rNorm <= 0.03928 ? rNorm / 12.92 : Math.pow((rNorm + 0.055) / 1.055, 2.4)) +
         0.7152 * (gNorm <= 0.03928 ? gNorm / 12.92 : Math.pow((gNorm + 0.055) / 1.055, 2.4)) +
         0.0722 * (bNorm <= 0.03928 ? bNorm / 12.92 : Math.pow((bNorm + 0.055) / 1.055, 2.4))
}

function isColorLight(r: number, g: number, b: number): boolean {
  const luminance = rgbToLuminance(r, g, b)
  return luminance > 0.2 // Limiar para determinar se a cor é clara
}

export async function analyzePhoto(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/solicitation/analyze-photo', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Analyze photo image.',
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
      
      // Realiza a detecção de rostos
      const [faceResult] = await client.faceDetection({
        image: { content: buffer }
      })
      const faces = faceResult.faceAnnotations || []

      // Validação de rostos
      if (faces.length !== 1) {
        errors.push('A imagem deve conter exatamente um rosto apenas.')
      }

      faces.forEach(face => {
        const { rollAngle, tiltAngle, panAngle, detectionConfidence } = face
        if (detectionConfidence == null || detectionConfidence < 0.70) {
          errors.push('A confiança na detecção da face deve ser superior a 70%.')
        }
        if (rollAngle == null || rollAngle < -15 || rollAngle > 15) {
          errors.push('O ângulo de rotação da face deve estar entre -15° e 15°.')
        }
        if (tiltAngle == null || tiltAngle < -15 || tiltAngle > 15) {
          errors.push('O ângulo de inclinação da face deve estar entre -15° e 15°.')
        }
        if (panAngle == null || panAngle < -15 || panAngle > 15) {
          errors.push('O ângulo de panorama da face deve estar entre -15° e 15°.')
        }
        if (face.sorrowLikelihood !== 'VERY_UNLIKELY' && face.sorrowLikelihood !== 'UNLIKELY') {
          errors.push('As expressões faciais devem ser neutras. Não sorria ou faça movimentos com o rosto.')
        }
      })

      // Realiza a detecção de objetos
      const [objectResult] = await client.objectLocalization({
        image: { content: buffer }
      })
      const objects = objectResult?.localizedObjectAnnotations || []

      // Validação de objetos
      if (!objects.some(object => 
        object.name === 'Person' && object.score != null && object.score >= 0.50
      )) {
        errors.push('Não temos 100% de certeza que há uma pessoa nesta imagem.')
      }

      // Realiza a detecção de rótulos
      const [labelResult] = await client.labelDetection({
        image: { content: buffer }
      })
      const labels = labelResult?.labelAnnotations || []

      // Validação de rótulos
      const forbiddenLabels = [
        'PHOTOGRAPH', 'MOBILE PHONE', 'COMMUNICATION DEVICE', 'SUNGLASSES',
        'GADGET', 'TELEPHONY', 'PORTABLE COMMUNICATION DEVICE', 'HAT', 'CAP'
      ]
      if (labels.some(label => {
        const desc = label.description?.toUpperCase() || ''
        return forbiddenLabels.some(keyword => desc.includes(keyword))
      })) {
        errors.push('A imagem não deve conter ocúlos escuros, chapéis, bonés, celulares...')
      }

      // Realiza a detecção de propriedades de imagem
      const [colorResult] = await client.imageProperties({
        image: { content: buffer }
      })
      const colors = colorResult?.imagePropertiesAnnotation?.dominantColors?.colors || []

      // Validação de propriedades de imagem
      if (!colors.some(color => 
        color.score != null && color.score > 0.25
      )) {
        errors.push('A imagem deve ter uma cor de fundo clara, sem objetos.')
      }
      const dominantColor = colors[0]
      if (dominantColor && dominantColor.color) {
        const { red = 0, green = 0, blue = 0 } = dominantColor.color
        if (!isColorLight(red ?? 0, green ?? 0, blue ?? 0)) {
          errors.push('A cor de fundo deve ser clara.')
        }
      } else {
        errors.push('A imagem está escura.')
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