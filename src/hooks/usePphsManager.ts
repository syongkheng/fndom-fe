import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'

export default function usePphsManager() {
  async function getPphsData() {
    return await HttpClient.post(ApiRoute.PPHS.GET_PPHS_DATA, {
      batch: '202511',
    }).then((res) => {
      return res.data.data.records
    })
  }

  return {
    getPphsData,
  }
}
