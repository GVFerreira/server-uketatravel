import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { UnauthorizedError } from "../_errors/unauthorized-error"

export async function saveQuestions(app:FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/solicitation/save-questions', {
    schema: {
      tags: ['Solicitation'],
      summary: 'Save personal questions of a solicitation ',
      body: z.object({
        solicitationId: z.string().uuid(),
        otherNationality: z.string().min(3).optional(),
        occupation: z.string().optional(),
        hasCriminalConviction: z.string(),
        hasCriminalConvictionLastYear: z.string().optional(),
        crimeHasBeenConvicted: z.string().optional(),
        countryCrimeHasBeenConvicted: z.string().optional(),
        convictedMoreThanOneYear: z.string().optional(),
        hasEverConvictedMoreThanOneYear: z.string().optional(),
        crimeConvictedMoreThanOneYear: z.string().optional(),
        countryConvictedMoreThanOneYear: z.string().optional(),
        initialDateConvictedMoreThanOneYear: z.string().optional(),
        endDateConvictedMoreThanOneYear: z.string().optional(),
        whichSituationWasInvolvedIn: z.array(z.string())
      }),
      response: {
        201: z.object({
          solicitationId: z.string().uuid()
        })
      }
    }
  }, async (request, reply) => {
    const data = request.body

    const solicitationExists = await prisma.solicitation.findUnique({
      where: { id: data.solicitationId }
    })

    if(!solicitationExists) {
      throw new UnauthorizedError("Unexpected solicitation ID. It does not exist")
    }

    const solicitation = await prisma.solicitation.update({
      where: {
        id: data.solicitationId
      },
      data: {
        otherNationality: data.otherNationality,
        occupation: data.occupation,
        hasCriminalConviction: data.hasCriminalConviction === "true" ? true : false,
        hasCriminalConvictionLastYear: data.hasCriminalConvictionLastYear === "true" ? true : false,
        crimeHasBeenConvicted: data.crimeHasBeenConvicted,
        countryCrimeHasBeenConvicted: data.crimeHasBeenConvicted,
        convictedMoreThanOneYear: data.convictedMoreThanOneYear === "true" ? true : false,
        hasEverConvictedMoreThanOneYear: data.hasEverConvictedMoreThanOneYear === "true" ? true : false,
        crimeConvictedMoreThanOneYear: data.crimeConvictedMoreThanOneYear,
        countryConvictedMoreThanOneYear: data.countryConvictedMoreThanOneYear,
        initialDateConvictedMoreThanOneYear: data.initialDateConvictedMoreThanOneYear,
        endDateConvictedMoreThanOneYear: data.endDateConvictedMoreThanOneYear,
        whichSituationWasInvolvedIn: JSON.stringify(data.whichSituationWasInvolvedIn)
      }
    })

    return reply.status(201).send({
      solicitationId: solicitation.id
    })
    
  })
}