import { Readable } from 'stream'

export async function convertStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Uint8Array[] = []

  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  return Buffer.concat(chunks)
}
