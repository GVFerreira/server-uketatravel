import { MinioStorageProvider } from "./implementations/minio";

const providers = {
  MINIO: new MinioStorageProvider()
}

export const storageProvider = providers['MINIO' as keyof typeof providers]
