import { rolesSchema } from "../roles"
import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  role: rolesSchema
})

export type User = z.infer<typeof userSchema>