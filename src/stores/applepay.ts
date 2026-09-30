import { defineStore } from 'pinia'
import { ref } from 'vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import type { ApplePayTransaction } from '@/interfaces/ApplePayTransaction.model'

export interface NewTransactionBody {
  amount: number
  merchant: string
  occurredDt: number
  category: string | null
}

export const useApplePayStore = defineStore('applepay', () => {
  const transactions = ref<ApplePayTransaction[]>([])
  const isLoading = ref(false)

  async function fetchTransactions() {
    isLoading.value = true
    const res = await HttpClient.get(ApiRoute.APPLEPAY.GET_ALL).catch(() => null)
    transactions.value = (res?.data?.data as ApplePayTransaction[]) ?? []
    isLoading.value = false
  }

  async function updateCategory(transactionId: string, category: string | null): Promise<boolean> {
    const res = await HttpClient.post(ApiRoute.APPLEPAY.UPDATE_CATEGORY(transactionId), { category }).catch(() => null)
    const updated = res?.data?.data as ApplePayTransaction | undefined
    if (!updated) return false
    const idx = transactions.value.findIndex((t) => t.id === transactionId)
    if (idx !== -1) transactions.value[idx] = updated
    return true
  }

  // A card label is keyed by card_last4, not by transaction — one save
  // applies to every row sharing that card_last4, so patch them all
  // locally instead of refetching the whole list.
  async function setCardLabel(cardLast4: string, label: string | null): Promise<boolean> {
    const res = await HttpClient.post(ApiRoute.APPLEPAY.SET_CARD_LABEL(cardLast4), { label }).catch(() => null)
    const updated = res?.data?.data as { cardLast4: string; label: string | null } | undefined
    if (!updated) return false
    transactions.value.forEach((t) => {
      if (t.cardLast4 === cardLast4) t.cardLabel = updated.label
    })
    return true
  }

  async function addTransaction(body: NewTransactionBody): Promise<boolean> {
    const res = await HttpClient.post(ApiRoute.APPLEPAY.CREATE, body).catch(() => null)
    const created = res?.data?.data as ApplePayTransaction | undefined
    if (!created) return false
    transactions.value = [...transactions.value, created].sort((a, b) => b.occurredDt - a.occurredDt)
    return true
  }

  async function deleteTransaction(transactionId: string): Promise<boolean> {
    const res = await HttpClient.delete(ApiRoute.APPLEPAY.DELETE(transactionId)).catch(() => null)
    if (!res?.data?.data?.deleted) return false
    transactions.value = transactions.value.filter((t) => t.id !== transactionId)
    return true
  }

  return {
    transactions,
    isLoading,
    fetchTransactions,
    addTransaction,
    deleteTransaction,
    updateCategory,
    setCardLabel,
  }
})
