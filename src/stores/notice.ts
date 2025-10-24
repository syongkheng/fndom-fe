import { defineStore } from 'pinia'
import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import type { FndManageNotice } from '@/interfaces/forms/FndManageNotice.model'

export const useNoticeManagerStore = defineStore('noticeManager', {
  state: () => ({
    selectedNotice: null as FndManageNotice | null,
    viewOnly: false,
    notices: [] as FndManageNotice[],
  }),
  actions: {
    async retrieveAllNotices() {
      try {
        const res = await HttpClient.get(ApiRoute.NOTICE.RETRIEVE)
        this.notices = res.data.data
      } catch (err) {
        console.error('Something went wrong retrieving notices:', err)
      }
    },
    async createNotice(notice: FndManageNotice) {
      try {
        const res = await HttpClient.post(ApiRoute.NOTICE.ADD, notice)
        console.log('Create notice result:', res.data)
        await this.retrieveAllNotices()
      } catch (err) {
        console.error('Something went wrong creating notice:', err)
      }
    },
    async updateNotice(notice: FndManageNotice, id: number) {
      try {
        const res = await HttpClient.post(ApiRoute.NOTICE.UPDATE, { ...notice, id })
        console.log('Update notice result:', res.data)
        await this.retrieveAllNotices()
      } catch (err) {
        console.error('Something went wrong updating notice:', err)
      }
    },
    async deleteNotice(notice: FndManageNotice) {
      try {
        const res = await HttpClient.post(ApiRoute.NOTICE.DELETE, { id: notice.id })
        console.log('Delete notice result:', res.data)
        await this.retrieveAllNotices()
      } catch (err) {
        console.error('Something went wrong deleting notice:', err)
      }
    },
    async viewNotice(noticeId: number) {
      try {
        await HttpClient.post(`${ApiRoute.NOTICE.VIEW}`, { id: noticeId })
      } catch (err) {
        console.error('Something went wrong viewing notice:', err)
        return null
      }
    },
  },
})
