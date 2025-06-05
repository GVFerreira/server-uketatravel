import S3 from 'aws-sdk/clients/s3'
import { Readable } from 'stream'
import { convertStreamToBuffer } from '@/helpers/convert-file-to-buffer'
import { IStorageProvider } from '../interface'

import dotenv from 'dotenv'
dotenv.config()

interface UploadFile {
  file: Readable
  filename: string
  mimetype?: string
}

export class MinioStorageProvider implements IStorageProvider {
  client: S3

  constructor() {
    this.client = new S3({
      endpoint: process.env.STORAGE_ENDPOINT,
      apiVersion: 'latest',
      region: process.env.STORAGE_REGION,
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
      signatureVersion: 'v4',
      s3ForcePathStyle: true,
    })
  }

  async upload(uploaded: UploadFile, path: string): Promise<string> {
    const { file, filename } = uploaded
    const fileBuffer = await convertStreamToBuffer(file)

    const params = {
      Bucket: process.env.STORAGE_BUCKET as string,
      Key: `${path}/${filename}`,
      Body: fileBuffer,
      ACL: 'public-read',
      ContentType: uploaded.mimetype,
    }

    try {
      const { Location } = await this.client.upload(params).promise()
      return Location
    } catch (error) {
      console.error('Upload error:', error)
      throw new Error('Error uploading file')
    }
  }

  async delete(path: string): Promise<void> {
    const params = {
      Bucket: process.env.STORAGE_BUCKET as string,
      Key: path,
    }

    try {
      await this.client.deleteObject(params).promise()
    } catch (error) {
      console.error('Delete error:', error)
      throw new Error('Error deleting file')
    }
  }
}
