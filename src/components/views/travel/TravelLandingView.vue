<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useAuthenticationStore } from '@/stores/authentication'
import { useNav } from '@/hooks/useNav'

const { t } = useI18n()
const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const { isAuthenticated } = storeToRefs(authStore)
const nav = useNav()

const handleActivate = () => {
  rememberFigureClicked()
  showHints.value = false
  // Logged-in: the character is the entry point to the dashboard.
  // Logged-out: it's the login prompt.
  if (isAuthenticated.value) {
    nav.redirectToDashboard()
  } else {
    layoutStore.loginDialog.setTrue()
  }
}

// ── Cues that the figure is clickable ─────────────────────────────────────
// ensō (brushed circle) on hover/focus/proximity, a first-visit inscription +
// seal and footprint trail, cursor lean, and a quiet fallback link.

const HINT_SEEN_KEY = 'fndom-landing-figure-clicked'
const HINT_DELAY_MS = 3000
const NEAR_RADIUS_PX = 220
const MAX_LEAN_PX = 10

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches

const figureEl = ref<HTMLElement | null>(null)
const isHovered = ref(false)
const isFocused = ref(false)
const isNear = ref(false)
const isIntro = ref(false)
const isInscriptionHovered = ref(false)
const showHints = ref(false)
const lean = ref({ x: 0, y: 0 })

const isActive = computed(
  () => isHovered.value || isFocused.value || isNear.value || isIntro.value || isInscriptionHovered.value,
)

// Nearest to her first; sizes grow towards the viewer. x/y are % of the trail box.
const FOOTPRINTS = [
  { x: 56, y: 4, size: 0.7, rot: -8, flip: false },
  { x: 44, y: 22, size: 0.85, rot: -14, flip: true },
  { x: 55, y: 41, size: 1, rot: -6, flip: false },
  { x: 41, y: 60, size: 1.2, rot: -16, flip: true },
  { x: 53, y: 82, size: 1.4, rot: -8, flip: false },
]
// Stepped in from the viewer upwards so the trail "leads" to her, then fades
// and loops — every print shares one cycle, offset by its step.
const footprintDelay = (i: number) => `${(FOOTPRINTS.length - 1 - i) * 0.5}s`

const hasClickedFigureBefore = () => {
  try {
    return localStorage.getItem(HINT_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function rememberFigureClicked() {
  try {
    localStorage.setItem(HINT_SEEN_KEY, '1')
  } catch {
    // storage unavailable — hints will simply show again next visit
  }
}

const onHeroPointerMove = (e: PointerEvent) => {
  if (!canHover || prefersReducedMotion || !figureEl.value) return
  const rect = figureEl.value.getBoundingClientRect()
  const dx = e.clientX - (rect.left + rect.width / 2)
  const dy = e.clientY - (rect.top + rect.height / 2)
  const near = Math.hypot(dx, dy) < NEAR_RADIUS_PX + rect.width / 2
  isNear.value = near
  lean.value = near
    ? {
        x: Math.max(-MAX_LEAN_PX, Math.min(MAX_LEAN_PX, dx * 0.05)),
        y: Math.max(-MAX_LEAN_PX / 2, Math.min(MAX_LEAN_PX / 2, dy * 0.03)),
      }
    : { x: 0, y: 0 }
}

const onHeroPointerLeave = () => {
  isNear.value = false
  lean.value = { x: 0, y: 0 }
}

const timers: ReturnType<typeof setTimeout>[] = []

const scheduleCues = () => {
  if (isAuthenticated.value) return
  // Touch screens can't hover — draw the ensō once so the figure reads as tappable.
  if (!canHover) {
    timers.push(setTimeout(() => (isIntro.value = true), 1200))
    timers.push(setTimeout(() => (isIntro.value = false), 4200))
  }
  if (!hasClickedFigureBefore()) {
    timers.push(setTimeout(() => (showHints.value = true), HINT_DELAY_MS))
  }
}

// Fog thins around her while she's "active" — eased in the render loop.
let fogClear = 0

const figureCenterInHero = () => {
  const hero = fogCanvasEl.value?.parentElement
  if (!figureEl.value || !hero) return null
  const f = figureEl.value.getBoundingClientRect()
  const h = hero.getBoundingClientRect()
  return { x: f.left - h.left + f.width / 2, y: f.top - h.top + f.height / 2 }
}

// Drifting mist: soft radial-gradient patches drawn on a canvas, travelling
// loosely from top-left to bottom-right with a perpendicular sine wobble so
// the path reads as wind-blown rather than a straight scroll. Each patch
// picks a random peak opacity (a "burst" of thin/medium/thick fog) and fades
// in/out over its own lifetime rather than looping uniformly.
const fogCanvasEl = ref<HTMLCanvasElement | null>(null)
let fogCtx: CanvasRenderingContext2D | null = null
let rafId = 0
let resizeObserver: ResizeObserver | null = null
let logicalWidth = 0
let logicalHeight = 0
let lastFrameTime = 0

interface FogWisp {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  size: number
  peakAlpha: number
  age: number
  lifespan: number
  wobblePhase: number
  wobbleAmp: number
  wobbleFreq: number
}

const MAX_WISPS = 6
const BURST_LEVELS = [0.4, 0.55, 0.75]
let wisps: FogWisp[] = []

const randRange = (min: number, max: number) => min + Math.random() * (max - min)

const spawnWisp = (): FogWisp => {
  const diag = Math.hypot(logicalWidth, logicalHeight)
  const angle = randRange(22, 48) * (Math.PI / 180) // roughly top-left to bottom-right
  const speed = randRange(0.05, 0.11) * diag
  return {
    x: randRange(-0.2, 0.3) * logicalWidth,
    y: randRange(-0.2, 0.25) * logicalHeight,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    size: randRange(0.16, 0.34) * diag,
    peakAlpha: BURST_LEVELS[Math.floor(Math.random() * BURST_LEVELS.length)],
    age: 0,
    lifespan: randRange(10, 18),
    wobblePhase: randRange(0, Math.PI * 2),
    wobbleAmp: randRange(0.015, 0.05) * diag,
    wobbleFreq: randRange(0.08, 0.2),
  }
}

const drawWisp = (ctx: CanvasRenderingContext2D, wisp: FogWisp, alpha: number) => {
  const perpAngle = wisp.angle + Math.PI / 2
  const wobble = Math.sin(wisp.age * wisp.wobbleFreq * Math.PI * 2 + wisp.wobblePhase) * wisp.wobbleAmp
  const x = wisp.x + Math.cos(perpAngle) * wobble
  const y = wisp.y + Math.sin(perpAngle) * wobble

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, wisp.size)
  gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
  gradient.addColorStop(0.45, `rgba(255, 255, 255, ${alpha * 0.65})`)
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(wisp.angle)
  ctx.scale(1, 0.55) // flatten into a drifting streak rather than a round puff
  ctx.translate(-x, -y)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, wisp.size, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const wispAlpha = (wisp: FogWisp) => {
  const life = wisp.age / wisp.lifespan
  if (life < 0.2) return (life / 0.2) * wisp.peakAlpha
  if (life < 0.7) return wisp.peakAlpha
  if (life > 1) return 0
  return (1 - (life - 0.7) / 0.3) * wisp.peakAlpha
}

const tick = (time: number) => {
  if (!fogCtx || !logicalWidth || !logicalHeight) {
    rafId = requestAnimationFrame(tick)
    return
  }
  if (!lastFrameTime) lastFrameTime = time
  const dt = Math.min((time - lastFrameTime) / 1000, 0.05)
  lastFrameTime = time

  fogCtx.clearRect(0, 0, logicalWidth, logicalHeight)

  fogClear += ((isActive.value ? 1 : 0) - fogClear) * Math.min(1, dt * 3)
  const center = fogClear > 0.01 ? figureCenterInHero() : null
  const clearRadius = 0.45 * Math.hypot(logicalWidth, logicalHeight)

  for (const wisp of wisps) {
    wisp.age += dt
    wisp.x += wisp.vx * dt
    wisp.y += wisp.vy * dt
    let alpha = wispAlpha(wisp)
    if (center) {
      const falloff = Math.max(0, 1 - Math.hypot(wisp.x - center.x, wisp.y - center.y) / clearRadius)
      alpha *= 1 - fogClear * 0.7 * falloff
    }
    if (alpha > 0.01) drawWisp(fogCtx, wisp, alpha)
  }

  wisps = wisps.filter((wisp) => wisp.age < wisp.lifespan)
  while (wisps.length < MAX_WISPS) {
    wisps.push(spawnWisp())
  }

  rafId = requestAnimationFrame(tick)
}

const drawStaticFrame = () => {
  if (!fogCtx || !logicalWidth || !logicalHeight) return
  fogCtx.clearRect(0, 0, logicalWidth, logicalHeight)
  for (const wisp of wisps) {
    drawWisp(fogCtx, wisp, wisp.peakAlpha * 0.7)
  }
}

const resizeCanvas = () => {
  const canvas = fogCanvasEl.value
  const hero = canvas?.parentElement
  if (!canvas || !hero) return
  logicalWidth = hero.clientWidth
  logicalHeight = hero.clientHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = logicalWidth * dpr
  canvas.height = logicalHeight * dpr
  fogCtx = canvas.getContext('2d')
  // setTransform (not scale) — resizeCanvas can run more than once (e.g. the
  // ResizeObserver fires its own initial callback right after onMounted's
  // explicit call), and getContext('2d') returns the same persistent context
  // each time, so repeated .scale() calls would compound instead of reset.
  fogCtx?.setTransform(dpr, 0, 0, dpr, 0, 0)

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    drawStaticFrame()
  }
}

onMounted(() => {
  const canvas = fogCanvasEl.value
  if (!canvas || !canvas.parentElement) return

  resizeObserver = new ResizeObserver(() => {
    resizeCanvas()
  })
  resizeObserver.observe(canvas.parentElement)
  resizeCanvas()

  while (wisps.length < MAX_WISPS) {
    wisps.push(spawnWisp())
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    drawStaticFrame()
  } else {
    rafId = requestAnimationFrame(tick)
  }
})

onMounted(scheduleCues)

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
  timers.forEach(clearTimeout)
})
</script>

<template>
  <div
    class="art-hero"
    :class="{ 'art-hero--still': prefersReducedMotion }"
    @pointermove="onHeroPointerMove"
    @pointerleave="onHeroPointerLeave"
  >
    <!-- Shared ink-edge texture for the ensō, seal and footprints -->
    <svg class="art-defs" aria-hidden="true" focusable="false">
      <filter id="landing-ink-rough" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" />
      </filter>
      <filter id="landing-ink-brush" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035 0.6" numOctaves="3" seed="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" />
      </filter>
    </svg>

    <img src="/mountain-ridges.png" class="art-bg" alt="" aria-hidden="true" />
    <canvas ref="fogCanvasEl" class="art-fog-canvas" aria-hidden="true"></canvas>

    <div v-if="!isAuthenticated" class="art-trail" :class="{ 'is-visible': showHints }" aria-hidden="true">
      <svg
        v-for="(print, i) in FOOTPRINTS"
        :key="i"
        class="art-print"
        viewBox="0 0 20 40"
        :style="{
          left: `${print.x}%`,
          top: `${print.y}%`,
          width: `${print.size}em`,
          transform: `translate(-50%, -50%) rotate(${print.rot}deg) scaleX(${print.flip ? -1 : 1})`,
          animationDelay: footprintDelay(i),
        }"
      >
        <ellipse cx="10" cy="13" rx="6.2" ry="10" />
        <ellipse cx="10.6" cy="32" rx="4.8" ry="6" />
      </svg>
    </div>

    <div
      class="art-figure"
      :class="{ 'is-active': isActive }"
      :style="{ '--lean-x': `${lean.x}px`, '--lean-y': `${lean.y}px` }"
    >
      <div class="art-figure-float">
        <svg class="art-enso" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
          <path
            class="art-enso-stroke"
            pathLength="1"
            d="M 60 169.3 A 80 80 0 1 1 113.9 178.8"
          />
          <path
            class="art-enso-dry"
            pathLength="1"
            d="M 28.6 74 A 76 76 0 1 1 138 165.8"
          />
        </svg>
        <img
          ref="figureEl"
          src="/main-character-transparent.png"
          class="art-character"
          :alt="t('travel.landing.heroImageAlt')"
          role="button"
          tabindex="0"
          @click="handleActivate"
          @keyup.enter="handleActivate"
          @mouseenter="isHovered = true"
          @mouseleave="isHovered = false"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
      </div>
    </div>

    <button
      v-if="!isAuthenticated"
      type="button"
      class="art-inscription"
      :class="{ 'is-visible': showHints }"
      :tabindex="showHints ? 0 : -1"
      :aria-hidden="!showHints"
      :aria-label="t('travel.landing.inscriptionLabel')"
      @click="handleActivate"
      @mouseenter="isInscriptionHovered = true"
      @mouseleave="isInscriptionHovered = false"
    >
      <span class="art-inscription-text" lang="zh">
        <span>千里之行</span>
        <span>始于足下</span>
      </span>
      <span class="art-seal" lang="zh" aria-hidden="true">入</span>
    </button>

    <button v-if="!isAuthenticated" type="button" class="art-signin" @click="handleActivate">
      {{ t('travel.landing.signIn') }}
    </button>
  </div>
</template>

<style scoped>
.art-hero {
  position: relative;
  width: 100%;
  /* Intentionally taller than the header+footer-adjusted viewport on desktop
     — the footer sits below the fold until the user scrolls, instead of the
     page fitting exactly in one screen. html/body/#app have no height:100%
     anchor anywhere in this app, so flex:1 has nothing to grow into here;
     this is a fixed vh value for the same reason the calc below is. */
  height: 100vh;
  min-height: 320px;
  overflow: hidden;
  background: #efe6d3;
}

.art-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 50%;
  display: block;
}

.art-fog-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

.art-defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

/* ── Figure: outer box leans toward the cursor, inner box floats ──────── */

.art-figure {
  position: absolute;
  left: 50.5%;
  bottom: 26%;
  width: 14vw;
  min-width: 110px;
  max-width: 260px;
  transform: translateX(-50%) translate(var(--lean-x, 0px), var(--lean-y, 0px));
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.art-figure-float {
  position: relative;
  animation: art-character-float 3.2s ease-in-out infinite;
}

.art-character {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: auto;
  cursor: pointer;
  transition: filter 0.9s ease;
  filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.25));
}

.art-figure.is-active .art-character {
  filter: drop-shadow(0 34px 22px rgba(0, 0, 0, 0.16));
}

/* The ensō is the focus indicator, so the default outline is redundant */
.art-character:focus-visible {
  outline: none;
}

@keyframes art-character-float {
  0%, 100% { transform: translateY(-20px); }
  50%      { transform: translateY(-34px); }
}

/* ── Ensō: brushed circle drawn around her when active ─────────────────── */

.art-enso {
  position: absolute;
  z-index: 0;
  left: 50%;
  top: 52%;
  width: 165%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%) rotate(-12deg);
  overflow: visible;
  pointer-events: none;
  filter: url(#landing-ink-brush);
}

.art-enso path {
  fill: none;
  stroke: #2b2522;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
  /* Leaving: fade out first, then silently reset the stroke for next time */
  transition: opacity 0.6s ease, stroke-dashoffset 0s linear 0.6s;
}

.art-enso-stroke {
  stroke-width: 6.5;
}

.art-enso-dry {
  stroke-width: 2;
}

.art-figure.is-active .art-enso path {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 1.1s cubic-bezier(0.55, 0.05, 0.25, 1), opacity 0.25s ease;
}

.art-figure.is-active .art-enso-stroke {
  opacity: 0.5;
}

.art-figure.is-active .art-enso-dry {
  opacity: 0.35;
  transition-delay: 0.25s;
}

/* ── Footprint trail leading up the ridge to her ───────────────────────── */

.art-trail {
  position: absolute;
  left: 50.5%;
  bottom: 6%;
  width: 16vw;
  height: 20%;
  transform: translateX(-50%);
  font-size: clamp(10px, 1.2vw, 16px);
  pointer-events: none;
}

.art-print {
  position: absolute;
  height: auto;
  fill: rgba(38, 32, 29, 0.42);
  filter: url(#landing-ink-rough);
  opacity: 0;
}

.art-trail.is-visible .art-print {
  animation: art-print-step 6s ease-in-out infinite both;
}

/* 6s cycle: ink in (~0.5s), hold while the rest of the trail appears, fade,
   then a short blank pause before the next pass */
@keyframes art-print-step {
  0%   { opacity: 0; }
  8%   { opacity: 1; }
  55%  { opacity: 1; }
  72%  { opacity: 0; }
  100% { opacity: 0; }
}

/* ── Painted inscription + red seal (first visits) ─────────────────────── */

.art-inscription {
  position: absolute;
  left: calc(50.5% + clamp(80px, 9vw, 175px));
  bottom: 30%;
  display: grid;
  grid-template-columns: auto auto;
  align-items: end;
  gap: 10px 8px;
  padding: 6px;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition: opacity 1.4s ease, transform 1.4s ease;
}

.art-inscription.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.art-inscription:focus-visible {
  outline: 2px solid rgba(178, 59, 46, 0.6);
  outline-offset: 4px;
  border-radius: 6px;
}

.art-inscription-text {
  grid-column: 2;
  display: flex;
  gap: 0.45em;
  writing-mode: vertical-rl;
  font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', 'BiauKai', 'Songti SC', serif;
  font-size: clamp(0.95rem, 1.35vw, 1.3rem);
  letter-spacing: 0.35em;
  color: rgba(38, 32, 29, 0.78);
  /* Paper-coloured halo so ridge ink behind the text doesn't cut through it */
  text-shadow: 0 0 6px #f4eeea, 0 0 12px #f4eeea, 0 0 18px rgba(244, 238, 234, 0.8);
}

.art-seal {
  grid-column: 1;
  display: grid;
  place-items: center;
  width: 1.7em;
  height: 1.7em;
  font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', 'BiauKai', serif;
  font-size: clamp(0.85rem, 1.1vw, 1.05rem);
  line-height: 1;
  color: #f6eee2;
  background: #b23b2e;
  border-radius: 3px;
  transform: rotate(-4deg);
  filter: url(#landing-ink-rough);
  transition: transform 0.3s ease;
}

.art-inscription:hover .art-seal {
  transform: rotate(-4deg) scale(1.08);
}

/* ── Quiet fallback link ───────────────────────────────────────────────── */

.art-signin {
  position: absolute;
  left: 50%;
  bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  padding: 6px 10px;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  color: rgba(45, 38, 34, 0.6);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 3px;
  cursor: pointer;
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
}

.art-signin:hover,
.art-signin:focus-visible {
  color: rgba(45, 38, 34, 0.9);
  text-decoration-color: currentColor;
}

.art-signin:focus-visible {
  outline: 2px solid rgba(45, 38, 34, 0.4);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ── Reduced motion: no float/lean/drawing, cues simply appear ─────────── */

.art-hero--still .art-figure-float {
  animation: none;
  transform: translateY(-24px);
}

.art-hero--still .art-figure,
.art-hero--still .art-inscription,
.art-hero--still .art-enso path {
  transition-duration: 0s;
  transition-delay: 0s;
}

.art-hero--still .art-inscription {
  transform: none;
}

.art-hero--still .art-trail.is-visible .art-print {
  animation: none;
  opacity: 1;
}

@media (max-width: 640px) {
  .art-hero {
    /* Portrait 9:16 on phones; capped so a short/landscape viewport doesn't
       end up with a hero taller than the screen. */
    height: auto;
    aspect-ratio: 9 / 16;
    max-height: calc(100svh - 80px);
  }

  .art-figure {
    width: 20vw;
    bottom: 24%;
  }

  .art-trail {
    bottom: 7%;
    width: 26vw;
    height: 17%;
  }

  .art-inscription {
    left: calc(50.5% + max(64px, 12vw));
    bottom: 34%;
  }
}
</style>
