import { hash } from 'bcryptjs'
import { faker } from '@faker-js/faker'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  await prisma.user.deleteMany()

  const passwordHash = await hash('1234abcd', 1)

  await prisma.user.create({
    data: {
      name: faker.person.firstName(),
      email: 'me@gvf.dev',
      avatarUrl: 'https://github.com/gvferreira.png',
      passwordHash
    }
  })
}

seed().then(() => {
  console.log('Database seeded')
})