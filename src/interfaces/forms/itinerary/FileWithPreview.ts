import { GeneratorUtils } from '@/utilities/GeneratorUtils'

export class FileWithPreview {
  constructor(public file: File) {
    this.previewUrl = URL.createObjectURL(file)
    this.name = file.name
    this.mimeType = file.type
    this.sizeInBytes = file.size
    this.status = 'pending'
    this.uuid = GeneratorUtils.generateUUID()
  }

  uuid: string
  previewUrl: string
  name: string
  mimeType: string
  sizeInBytes: number
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  progress?: number
  error?: string
  uploadedAt?: Date
  blob?: string
}
