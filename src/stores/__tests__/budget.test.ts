import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/interceptors/HttpClient', () => ({ default: http }))

import { useBudgetStore } from '@/stores/budget'
import type { BudgetTableSummary } from '@/interfaces/forms/budget/BudgetTable'

const summary = (sessionId: string) => ({ sessionId, name: sessionId }) as unknown as BudgetTableSummary

describe('budget store — mutation paths', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    http.get.mockReset()
    http.post.mockReset()
    http.delete.mockReset()
  })

  it('renameTable posts to /budget/:id/update', async () => {
    http.post.mockResolvedValue({ data: { data: {} } })
    await useBudgetStore().renameTable('abc', 'New name')
    expect(http.post).toHaveBeenCalledWith('/budget/abc/update', { name: 'New name' })
  })

  it('removeCollaborator posts an empty body to /budget/:id/collaborator/:userId/delete', async () => {
    http.post.mockResolvedValue({ data: { data: { removed: true } } })
    await expect(useBudgetStore().removeCollaborator('abc', 7)).resolves.toBe(true)
    expect(http.post).toHaveBeenCalledWith('/budget/abc/collaborator/7/delete', {})
  })

  it('never uses HTTP DELETE', async () => {
    http.post.mockResolvedValue({ data: { data: { left: true, removed: true } } })
    const store = useBudgetStore()
    await store.renameTable('abc', 'x')
    await store.removeCollaborator('abc', 1)
    await store.leaveTable('abc')
    expect(http.delete).not.toHaveBeenCalled()
  })
})

describe('budget store — leaveTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    http.post.mockReset()
  })

  it('posts {} to /budget/:id/leave and drops the table from sharedTables on success', async () => {
    http.post.mockResolvedValue({ data: { data: { left: true } } })
    const store = useBudgetStore()
    store.sharedTables = [summary('a'), summary('b')]
    store.myTables = [summary('mine')]

    await expect(store.leaveTable('a')).resolves.toBe(true)
    expect(http.post).toHaveBeenCalledWith('/budget/a/leave', {})
    expect(store.sharedTables.map((t) => t.sessionId)).toEqual(['b'])
    expect(store.myTables.map((t) => t.sessionId)).toEqual(['mine'])
  })

  it('returns false and keeps sharedTables when the request fails (e.g. owner gets 403)', async () => {
    http.post.mockRejectedValue(Object.assign(new Error('403'), { response: { status: 403 } }))
    const store = useBudgetStore()
    store.sharedTables = [summary('a')]
    await expect(store.leaveTable('a')).resolves.toBe(false)
    expect(store.sharedTables).toHaveLength(1)
  })

  it('returns false when the response does not confirm left', async () => {
    http.post.mockResolvedValue({ data: { data: { left: false } } })
    const store = useBudgetStore()
    store.sharedTables = [summary('a')]
    await expect(store.leaveTable('a')).resolves.toBe(false)
    expect(store.sharedTables).toHaveLength(1)
  })
})

describe('budget store — table and item mutation paths', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    http.post.mockReset()
  })

  it('deleteTable posts {} to /budget/:id/delete and drops it from myTables', async () => {
    http.post.mockResolvedValue({ data: { data: { deleted: true } } })
    const store = useBudgetStore()
    store.myTables = [summary('a'), summary('b')]
    await expect(store.deleteTable('a')).resolves.toBe(true)
    expect(http.post).toHaveBeenCalledWith('/budget/a/delete', {})
    expect(store.myTables.map((t) => t.sessionId)).toEqual(['b'])
  })

  it('updateItem posts to /budget/:id/item/:itemId/update and sends a cleared category as null', async () => {
    http.post.mockResolvedValue({ data: { data: { id: 'i1', name: 'x', status: 'to_buy', sortOrder: 0 } } })
    await expect(useBudgetStore().updateItem('a', 'i1', { category: null as unknown as string })).resolves.toBe(true)
    expect(http.post).toHaveBeenCalledWith('/budget/a/item/i1/update', { category: null })
    // null survives JSON serialisation (undefined would be dropped and read as "unchanged")
    expect(JSON.parse(JSON.stringify(http.post.mock.calls[0][1]))).toEqual({ category: null })
  })

  it('deleteItem posts {} to /budget/:id/item/:itemId/delete', async () => {
    http.post.mockResolvedValue({ data: { data: { deleted: true } } })
    await useBudgetStore().deleteItem('a', 'i1')
    expect(http.post).toHaveBeenCalledWith('/budget/a/item/i1/delete', {})
  })
})
