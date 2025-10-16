import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import type { FndManageNotice } from '@/interfaces/forms/FndManageNotice.model'
import { ref } from 'vue'

export function useNoticeManager() {
  const notices = ref<FndManageNotice[]>([])
  const retrieveAllNotices = async () => {
    const retrievedNotice = await HttpClient.get(ApiRoute.NOTICE.RETRIEVE)
      .then((res) => {
        return res.data.data
      })
      .catch((err) => {
        console.error('Something went wrong retrieving notices: ', err)
      })

    notices.value = retrievedNotice
  }

  const createNotice = async (notice: FndManageNotice) => {
    const createNoticeResult = await HttpClient.post(ApiRoute.NOTICE.ADD, notice)
      .then((res) => {
        console.log('Res: ', res.data)
        return res.data.data
      })
      .catch((err) => {
        console.error('Something went wrong creating notice: ', err)
      })
    console.log('Create notices result: ', createNoticeResult)
  }

  const updateNotice = async (notice: FndManageNotice, id: number) => {
    console.log('updateNotice: ', notice)
    const updateNoticeResult = await HttpClient.post(ApiRoute.NOTICE.UPDATE, { ...notice, id })
      .then((res) => {
        console.log('Res: ', res.data)
        return res.data.data
      })
      .catch((err) => {
        console.error('Something went wrong updating notice: ', err)
      })

    console.log('Update notices result: ', updateNoticeResult)
  }

  const deleteNotice = async (notice: FndManageNotice) => {
    console.log('Delete notice')
    const deleteNoticeResult = await HttpClient.post(ApiRoute.NOTICE.DELETE, { id: notice.id })
      .then((res) => {
        console.log('Res: ', res.data)
        return res.data.data
      })
      .catch((err) => {
        console.error('Something went wrong deleting notice: ', err)
      })

    console.log('Delete notice Result: ', deleteNoticeResult)
  }

  return { notices, retrieveAllNotices, createNotice, updateNotice, deleteNotice }
}
