import nodemailer from 'nodemailer'
import { compile } from 'handlebars'
import { readFileSync } from 'fs'
import path from 'path'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOSTSERVER,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  }
})

// Função para compilar template manualmente
transporter.use('compile', (mail: any, callback: any) => {
  const templatePath = path.resolve('./templates', `${mail.data.template}.hbs`)
  const source = readFileSync(templatePath, 'utf-8').toString()
  const compiledTemplate = compile(source)
  const html = compiledTemplate(mail.data.context)

  mail.data.html = html
  callback()
})

export default transporter
