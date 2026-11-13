import { onMounted, onBeforeUnmount } from 'vue'

/**
 * Keeps bottom sheets usable while the on-screen keyboard is open.
 *
 * iOS Safari does not shrink the layout viewport when the keyboard opens:
 * `position: fixed; bottom: 0` elements (Element Plus `btt` drawers) stay
 * pinned behind the keyboard, and Safari pans the page instead. We mirror the
 * *visual* viewport into two CSS variables on <html>:
 *
 *   --vv-height     visible height above the keyboard
 *   --kb-inset      distance from the layout viewport's bottom to the top of
 *                   the keyboard (0 when no keyboard / on Android, where the
 *                   `interactive-widget=resizes-content` meta already resizes)
 *
 * main.css uses them to lift and cap `.el-drawer.btt`. A focusin handler also
 * scrolls the focused field to the middle of its drawer body once the
 * keyboard has finished animating, so the field you tapped stays tappable.
 *
 * Call once, from App.vue.
 */
export function useKeyboardViewport() {
  const root = document.documentElement
  const vv = window.visualViewport
  let raf = 0

  const apply = () => {
    raf = 0
    if (!vv) return
    const inset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
    root.style.setProperty('--vv-height', `${Math.round(vv.height)}px`)
    root.style.setProperty('--kb-inset', `${Math.round(inset)}px`)
    root.classList.toggle('kb-open', inset > 80)
  }

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(apply)
  }

  const isTextField = (el: Element | null): el is HTMLElement =>
    !!el && (el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'range', 'file'].includes(el.type)) ||
      (el as HTMLElement).isContentEditable)

  let focusTimer: ReturnType<typeof setTimeout> | null = null
  const onFocusIn = (e: FocusEvent) => {
    const target = e.target as Element | null
    if (!isTextField(target)) return
    const body = target.closest('.el-drawer__body')
    if (!body) return
    // Wait for the keyboard animation (~250-300 ms on iOS) before scrolling.
    if (focusTimer) clearTimeout(focusTimer)
    focusTimer = setTimeout(() => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 320)
  }

  onMounted(() => {
    apply()
    vv?.addEventListener('resize', schedule)
    vv?.addEventListener('scroll', schedule)
    window.addEventListener('orientationchange', schedule)
    document.addEventListener('focusin', onFocusIn)
  })

  onBeforeUnmount(() => {
    vv?.removeEventListener('resize', schedule)
    vv?.removeEventListener('scroll', schedule)
    window.removeEventListener('orientationchange', schedule)
    document.removeEventListener('focusin', onFocusIn)
    if (raf) cancelAnimationFrame(raf)
    if (focusTimer) clearTimeout(focusTimer)
  })
}
