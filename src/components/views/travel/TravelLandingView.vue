<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
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
  // Logged-in: the character is the entry point to the (currently empty,
  // more to come later) dashboard. Logged-out: it's the login prompt.
  if (isAuthenticated.value) {
    nav.redirectToDashboard()
  } else {
    layoutStore.loginDialog.setTrue()
  }
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

  for (const wisp of wisps) {
    wisp.age += dt
    wisp.x += wisp.vx * dt
    wisp.y += wisp.vy * dt
    const alpha = wispAlpha(wisp)
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

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="art-hero">
    <img src="/mountain-ridges.png" class="art-bg" alt="" aria-hidden="true" />
    <canvas ref="fogCanvasEl" class="art-fog-canvas" aria-hidden="true"></canvas>
    <img
      src="/main-character-transparent.png"
      class="art-character"
      :alt="t('travel.landing.heroImageAlt')"
      role="button"
      tabindex="0"
      @click="handleActivate"
      @keyup.enter="handleActivate"
    />
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

.art-character {
  position: absolute;
  left: 50.5%;
  bottom: 26%;
  width: 14vw;
  min-width: 110px;
  max-width: 260px;
  height: auto;
  transform: translateX(-50%) translateY(0);
  transition: filter 0.9s ease;
  cursor: pointer;
  filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.25));
  animation: art-character-float 3.2s ease-in-out infinite;
}

.art-character:hover {
  filter: drop-shadow(0 34px 22px rgba(0, 0, 0, 0.16));
}

@keyframes art-character-float {
  0%, 100% { transform: translateX(-50%) translateY(-20px); }
  50%      { transform: translateX(-50%) translateY(-34px); }
}

@media (max-width: 640px) {
  .art-hero {
    /* Mobile keeps the snug, no-scroll fit — only desktop pushes the footer
       below the fold. */
    height: calc(100vh - 80px - 220px);
  }

  .art-character {
    width: 20vw;
    bottom: 24%;
  }
}
</style>
