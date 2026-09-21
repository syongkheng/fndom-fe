import { ref, markRaw, type Component } from 'vue'
import { CircleCheck, CircleClose, InfoFilled } from '@element-plus/icons-vue'

/**
 * App-wide toast system — a single standardised look (rounded pill, left
 * icon, optional countdown ring, optional action button) instead of mixing
 * raw ElMessage() calls with bespoke components per feature. Mount
 * <ToastHost /> once (App.vue) and call useToast() anywhere to push one.
 */
export type ToastType = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
}

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  icon: Component
  duration: number
  ring: boolean
  action?: ToastAction
}

export interface ShowToastOptions {
  duration?: number
  /** Renders a circular countdown ring (draining over `duration`) instead of the static type icon. */
  ring?: boolean
  icon?: Component
  action?: ToastAction
}

const TYPE_ICON: Record<ToastType, Component> = {
  success: CircleCheck,
  error: CircleClose,
  info: InfoFilled,
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3000,
  error: 4000,
  info: 3000,
}

let nextId = 0
const toasts = ref<ToastItem[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()

function dismiss(id: number) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

// Drops any toast carrying an action (e.g. an undo prompt) whose action was
// triggered through some other path — a keyboard shortcut, say — so a stale
// button doesn't linger on screen.
function dismissActionToasts() {
  for (const t of toasts.value) {
    if (t.action) dismiss(t.id)
  }
}

function show(type: ToastType, message: string, opts: ShowToastOptions = {}): number {
  const id = ++nextId
  const duration = opts.duration ?? DEFAULT_DURATION[type]
  toasts.value.push({
    id,
    type,
    message,
    icon: markRaw(opts.icon ?? TYPE_ICON[type]),
    duration,
    ring: !!opts.ring,
    action: opts.action,
  })
  if (duration > 0) {
    timers.set(id, setTimeout(() => dismiss(id), duration))
  }
  return id
}

export function useToast() {
  return {
    toasts,
    success: (message: string, opts?: ShowToastOptions) => show('success', message, opts),
    error: (message: string, opts?: ShowToastOptions) => show('error', message, opts),
    info: (message: string, opts?: ShowToastOptions) => show('info', message, opts),
    action: (message: string, action: ToastAction, opts: Omit<ShowToastOptions, 'action'> = {}) =>
      show('info', message, { ...opts, action }),
    dismiss,
    dismissActionToasts,
  }
}
