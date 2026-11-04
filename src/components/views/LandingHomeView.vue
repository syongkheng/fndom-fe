<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNav } from '@/hooks/useNav'
import { activePlan as plan } from '@/constants/houseplan/floorplan'

const { t } = useI18n()
const { redirectTo } = useNav()

// Draw the real floor-plan data as a 2D blueprint (SVG units = metres).
const pad = 0.6
const viewBox = `${-pad} ${-pad} ${plan.width + pad * 2} ${plan.depth + pad * 2}`
const outlinePath = computed(() => plan.outline.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + ' Z')
const wallLines = computed(() => plan.walls.filter((w) => w.kind !== 'door'))
const doorLines = computed(() => plan.walls.filter((w) => w.kind === 'door'))

const modules = [
  { key: 'house', path: '/house' },
  { key: 'budget', path: '/budget' },
] as const
</script>

<template>
  <div class="landing page-container">
    <section class="hero">
      <div class="hero-copy">
        <p class="bp-label">{{ t('landingHome.eyebrow') }}</p>
        <h1 class="hero-title">{{ t('landingHome.title') }}</h1>
        <p class="hero-sub">{{ t('landingHome.subtitle') }}</p>
        <div class="hero-cta">
          <button type="button" class="bp-btn bp-btn--primary" @click="redirectTo('/house')">
            {{ t('landingHome.ctaPrimary') }} →
          </button>
          <button type="button" class="bp-btn" @click="redirectTo('/budget')">{{ t('landingHome.ctaSecondary') }}</button>
        </div>
      </div>

      <figure class="figure bp-panel">
        <svg :viewBox="viewBox" class="plan-svg" role="img" :aria-label="t('landingHome.figure')">
          <path :d="outlinePath" class="slab" />
          <line v-for="(w, i) in wallLines" :key="`w${i}`" :x1="w.x1" :y1="w.y1" :x2="w.x2" :y2="w.y2" class="wall" :class="{ parapet: w.kind === 'parapet' }" />
          <line v-for="(w, i) in doorLines" :key="`d${i}`" :x1="w.x1" :y1="w.y1" :x2="w.x2" :y2="w.y2" class="door" />
          <line v-for="(d, i) in plan.dashed" :key="`s${i}`" :x1="d.from[0]" :y1="d.from[1]" :x2="d.to[0]" :y2="d.to[1]" class="dash" />
          <g v-for="r in plan.rooms" :key="r.id">
            <circle :cx="r.pos[0]" :cy="r.pos[1]" r="0.32" class="marker" />
            <text :x="r.pos[0]" :y="r.pos[1]" class="marker-text">{{ r.id }}</text>
          </g>
          <!-- dimension lines -->
          <g class="dim">
            <line :x1="0" :y1="-0.3" :x2="plan.width" :y2="-0.3" />
            <line :x1="0" :y1="-0.45" :x2="0" :y2="-0.15" />
            <line :x1="plan.width" :y1="-0.45" :x2="plan.width" :y2="-0.15" />
            <text :x="plan.width / 2" :y="-0.4" class="dim-text">{{ plan.width.toFixed(2) }} m</text>
            <line :x1="-0.3" :y1="0" :x2="-0.3" :y2="plan.depth" />
            <line :x1="-0.45" :y1="0" :x2="-0.15" :y2="0" />
            <line :x1="-0.45" :y1="plan.depth" :x2="-0.15" :y2="plan.depth" />
            <text :x="-0.4" :y="plan.depth / 2" class="dim-text" :transform="`rotate(-90 -0.4 ${plan.depth / 2})`">{{ plan.depth.toFixed(2) }} m</text>
          </g>
        </svg>
        <figcaption class="bp-label caption">{{ t('landingHome.figure') }}</figcaption>
      </figure>
    </section>

    <section class="modules">
      <p class="bp-label">{{ t('landingHome.modulesHeading') }}</p>
      <div class="module-grid">
        <article
          v-for="(m, i) in modules"
          :key="m.key"
          class="module bp-panel"
          role="button"
          tabindex="0"
          @click="redirectTo(m.path)"
          @keyup.enter="redirectTo(m.path)"
        >
          <p class="bp-label">{{ String(i + 1).padStart(2, '0') }} / {{ m.key.toUpperCase() }}</p>
          <h2 class="module-title">{{ t(`landingHome.${m.key}.title`) }}</h2>
          <p class="module-desc">{{ t(`landingHome.${m.key}.desc`) }}</p>
          <ul class="specs">
            <li>{{ t(`landingHome.${m.key}.spec1`) }}</li>
            <li>{{ t(`landingHome.${m.key}.spec2`) }}</li>
            <li>{{ t(`landingHome.${m.key}.spec3`) }}</li>
          </ul>
          <span class="module-cta">{{ t(`landingHome.${m.key}.cta`) }} →</span>
        </article>
      </div>
    </section>

    <p class="bp-label sheet">{{ t('landingHome.sheet') }} · {{ t('landingHome.scale') }} · {{ t('landingHome.units') }}</p>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  gap: 40px;
  padding: 24px 0 8px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 32px;
  align-items: center;
}
.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.hero-title {
  font-size: clamp(1.9rem, 4.2vw, 3rem);
  line-height: 1.1;
}
.hero-sub {
  color: var(--color-text-secondary);
  max-width: 46ch;
}
.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}

/* Floor plan figure */
.figure {
  margin: 0;
  padding: 14px 14px 10px;
}
.plan-svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}
.slab {
  fill: var(--color-primary);
  fill-opacity: 0.07;
  stroke: none;
}
.wall {
  stroke: var(--color-heading);
  stroke-width: 0.14;
  stroke-linecap: square;
}
.wall.parapet {
  stroke: var(--color-text-secondary);
  stroke-width: 0.08;
}
.door {
  stroke: var(--color-accent);
  stroke-width: 0.1;
  stroke-linecap: butt;
}
.dash {
  stroke: var(--color-text-tertiary);
  stroke-width: 0.05;
  stroke-dasharray: 0.18 0.12;
}
.marker {
  fill: var(--color-background-soft);
  stroke: var(--color-primary);
  stroke-width: 0.06;
}
.marker-text {
  fill: var(--color-primary);
  font: 700 0.34px var(--font-mono);
  text-anchor: middle;
  dominant-baseline: central;
}
.dim line {
  stroke: var(--color-text-tertiary);
  stroke-width: 0.03;
}
.dim-text {
  fill: var(--color-text-tertiary);
  font: 0.34px var(--font-mono);
  text-anchor: middle;
}
.caption {
  display: block;
  margin-top: 8px;
}

/* Modules */
.modules {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.module {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 22px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.module:hover,
.module:focus-visible {
  border-color: var(--color-primary);
  background: var(--color-background-mute);
  outline: none;
}
.module-title {
  font-size: 1.3rem;
}
.module-desc {
  color: var(--color-text-secondary);
  font-size: 0.92rem;
}
.specs {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-text);
}
.specs li::before {
  content: '▸ ';
  color: var(--color-accent);
}
.module-cta {
  margin-top: auto;
  padding-top: 6px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--color-primary);
}

.sheet {
  text-align: right;
}

@media (max-width: 800px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
  }
  .module-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .sheet {
    text-align: left;
  }
}
</style>
