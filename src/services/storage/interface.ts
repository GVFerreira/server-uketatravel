import { Readable } from 'stream'

export interface IUploadFile {
  file: Readable
  filename: string
  mimetype?: string
}

export interface IStorageProvider {
  upload: (file: IUploadFile, path: string) => Promise<string>
  delete: (path: string) => Promise<void>
}
