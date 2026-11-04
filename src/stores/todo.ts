import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'
import { useToast } from '@/composables/useToast'
import { i18n } from '@/i18n'

const WEEK_MS = 7 * 86_400_000

export const MAX_PINNED = 3
export const MAX_TITLE = 500

export interface TodoTask {
  id: string
  title: string
  done: boolean
  doneAt: number | null
  pinned: boolean
  createdAt: number
}

export interface TodoSnapshot {
  task: TodoTask
  index: number
}

const pick = (t: TodoTask): TodoTask => ({
  id: t.id,
  title: t.title,
  done: t.done,
  doneAt: t.doneAt,
  pinned: t.pinned,
  createdAt: t.createdAt,
})

export const useTodoStore = defineStore('todo', () => {
  const toast = useToast()
  const t = (key: string) => i18n.global.t(key)

  // Array order is the manual sort order (the server's sort_order); pinned tasks are lifted to the top in `open`.
  const tasks = ref<TodoTask[]>([])
  const isLoading = ref(false)
  const loaded = ref(false)

  // Background refreshes must not clobber optimistic state: skipped while a write is in flight or a drag is running.
  let inflight = 0
  const dragging = ref(false)
  // Tasks added optimistically carry a temp id until the server answers; later edits wait on it.
  const creating = new Map<string, Promise<string | null>>()

  const open = computed(() => {
    const list = tasks.value.filter((x) => !x.done)
    return [...list.filter((x) => x.pinned), ...list.filter((x) => !x.pinned)]
  })
  const done = computed(() => tasks.value.filter((x) => x.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)))
  const pinnedCount = computed(() => tasks.value.filter((x) => x.pinned).length)
  const doneThisWeek = computed(() => {
    const since = Date.now() - WEEK_MS
    return done.value.filter((x) => (x.doneAt ?? 0) >= since).length
  })

  const find = (id: string) => tasks.value.find((x) => x.id === id)

  async function write<T>(run: () => Promise<T>): Promise<T | null> {
    inflight++
    try {
      return await run()
    } catch {
      return null
    } finally {
      inflight--
    }
  }

  const fail = () => toast.error(t('todo.failed'))

  async function fetchTasks(background = false) {
    if (background && (inflight > 0 || dragging.value || creating.size > 0)) return
    if (!background) isLoading.value = true
    const res = await HttpClient.get(ApiRoute.TODO.GET_ALL).catch(() => null)
    const list = res?.data?.data?.tasks as TodoTask[] | undefined
    // Re-check: a write may have started while the request was in flight.
    if (list && !(background && (inflight > 0 || dragging.value || creating.size > 0))) {
      tasks.value = list.map(pick)
      loaded.value = true
    }
    isLoading.value = false
  }

  function reset() {
    tasks.value = []
    loaded.value = false
  }

  /** Adds optimistically; returns false only when the title is empty. */
  function add(title: string): boolean {
    const clean = title.trim().slice(0, MAX_TITLE)
    if (!clean) return false
    const tempId = `tmp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    tasks.value.push({ id: tempId, title: clean, done: false, doneAt: null, pinned: false, createdAt: Date.now() })

    const request = write(async () => {
      const res = await HttpClient.post(ApiRoute.TODO.CREATE, { title: clean })
      return res.data.data as TodoTask
    }).then((created) => {
      const local = find(tempId)
      if (!created) {
        tasks.value = tasks.value.filter((x) => x.id !== tempId)
        fail()
        return null
      }
      if (local) local.id = created.id
      return created.id
    })
    creating.set(tempId, request)
    void request.finally(() => creating.delete(tempId))
    return true
  }

  // Resolves a possibly-temporary id to the real one (null if the create failed).
  async function realId(id: string): Promise<string | null> {
    const pending = creating.get(id)
    return pending ? await pending : id
  }

  async function patch(id: string, body: Record<string, unknown>, revert: () => void) {
    const rid = await realId(id)
    if (!rid) return
    const updated = await write(async () => {
      const res = await HttpClient.post(ApiRoute.TODO.UPDATE(rid), body)
      return res.data.data as TodoTask
    })
    if (!updated) {
      revert()
      fail()
      return
    }
    const local = find(rid)
    if (local) Object.assign(local, pick(updated))
  }

  function toggle(id: string) {
    const task = find(id)
    if (!task) return
    const before = pick(task)
    task.done = !task.done
    task.doneAt = task.done ? Date.now() : null
    if (task.done) task.pinned = false
    void patch(id, { done: task.done }, () => {
      const local = find(id) ?? find(before.id)
      if (local) Object.assign(local, before)
    })
  }

  function rename(id: string, title: string): boolean {
    const task = find(id)
    const clean = title.trim().slice(0, MAX_TITLE)
    if (!task || !clean) return false
    if (clean === task.title) return true
    const before = task.title
    task.title = clean
    void patch(id, { title: clean }, () => {
      const local = find(id)
      if (local) local.title = before
    })
    return true
  }

  /** Returns false when pinning would exceed MAX_PINNED. */
  function togglePin(id: string): boolean {
    const task = find(id)
    if (!task || task.done) return false
    if (!task.pinned && pinnedCount.value >= MAX_PINNED) return false
    task.pinned = !task.pinned
    const pinned = task.pinned
    void patch(id, { pinned }, () => {
      const local = find(id)
      if (local) local.pinned = !pinned
    })
    return true
  }

  /** Removes a task and returns what is needed to put it back with `restore`. */
  function remove(id: string): TodoSnapshot | null {
    const index = tasks.value.findIndex((x) => x.id === id)
    if (index < 0) return null
    const [task] = tasks.value.splice(index, 1)
    const snapshot = { task: pick(task), index }
    void (async () => {
      const rid = await realId(id)
      if (!rid) return
      const ok = await write(async () => {
        await HttpClient.post(ApiRoute.TODO.DELETE(rid), {})
        return true
      })
      if (!ok) {
        fail()
        insertLocal({ task: { ...snapshot.task, id: rid }, index })
      }
    })()
    return snapshot
  }

  function insertLocal(snapshot: TodoSnapshot) {
    if (find(snapshot.task.id)) return
    // A pin taken since the delete may have used up the cap.
    if (snapshot.task.pinned && pinnedCount.value >= MAX_PINNED) snapshot.task.pinned = false
    tasks.value.splice(Math.min(snapshot.index, tasks.value.length), 0, snapshot.task)
  }

  async function restore(snapshot: TodoSnapshot) {
    insertLocal({ task: { ...snapshot.task }, index: snapshot.index })
    const rid = await realId(snapshot.task.id)
    if (!rid) return
    const restored = await write(async () => {
      const res = await HttpClient.post(ApiRoute.TODO.RESTORE(rid), {})
      return res.data.data as TodoTask
    })
    if (!restored) {
      tasks.value = tasks.value.filter((x) => x.id !== snapshot.task.id)
      fail()
      return
    }
    const local = find(snapshot.task.id)
    if (local) Object.assign(local, pick(restored))
  }

  /** Moves `fromId` to where `overId` sits. Pinned and unpinned tasks reorder only within their own group. Local only; call `saveOrder` when the drag ends. */
  function move(fromId: string, overId: string) {
    if (fromId === overId) return
    const from = tasks.value.findIndex((x) => x.id === fromId)
    const over = tasks.value.findIndex((x) => x.id === overId)
    if (from < 0 || over < 0 || tasks.value[from].pinned !== tasks.value[over].pinned) return
    const [moved] = tasks.value.splice(from, 1)
    tasks.value.splice(over, 0, moved)
  }

  async function saveOrder() {
    const ids = (await Promise.all(tasks.value.map((x) => realId(x.id)))).filter((x): x is string => !!x)
    const ok = await write(async () => {
      await HttpClient.post(ApiRoute.TODO.REORDER, { ids })
      return true
    })
    if (!ok) {
      fail()
      void fetchTasks()
    }
  }

  return {
    tasks, isLoading, loaded, dragging, open, done, pinnedCount, doneThisWeek,
    fetchTasks, reset, add, toggle, rename, togglePin, remove, restore, move, saveOrder,
  }
})
