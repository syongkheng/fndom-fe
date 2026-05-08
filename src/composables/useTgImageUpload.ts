import HttpClient from '@/interceptors/HttpClient'

export function useTgImageUpload() {
  async function uploadTgImage(file: File, meta?: { sessionId?: string; uuid?: string }): Promise<{ shortCode: string; url: string }> {
    const form = new FormData()
    form.append('file', file)
    if (meta?.uuid) form.append('uuid', meta.uuid)
    if (meta?.sessionId) form.append('sessionId', meta.sessionId)
    const res = await HttpClient.post<{ code: number; status: string; data: { shortCode: string; url: string } }>(
      '/api/img/upload',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return res.data.data
  }

  return { uploadTgImage }
}
