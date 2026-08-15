import { defineStore } from 'pinia'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

export interface IotApiKeyStatus {
  hasKey: boolean
  name: string | null
  createdDt: number | null
  keyHint: string | null
}

export const useIotDeviceStore = defineStore('iotDevice', () => {
  async function fetchApiKeyStatus(): Promise<IotApiKeyStatus> {
    const res = await HttpClient.get(ApiRoute.IOT.API_KEY)
    return res.data.data as IotApiKeyStatus
  }

  async function generateApiKey(deviceName: string): Promise<string> {
    const res = await HttpClient.post(ApiRoute.IOT.API_KEY, { deviceName })
    return res.data.data.key as string
  }

  async function revokeApiKey(): Promise<void> {
    await HttpClient.delete(ApiRoute.IOT.API_KEY)
  }

  return {
    fetchApiKeyStatus,
    generateApiKey,
    revokeApiKey,
  }
})
