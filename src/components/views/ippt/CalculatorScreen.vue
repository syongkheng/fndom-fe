<script setup lang="ts">
import { ref, computed } from 'vue'
import { scoreReps, scoreRun, tierOf, fmtTime, nextTierInfo } from '@/utilities/ipptScoring'
import type { AgeBand } from '@/utilities/ipptScoring'
import IpptIcon from './IpptIcon.vue'

defineProps<{ mobile: boolean }>()

const ageBandVal = ref<AgeBand>('young')
const push = ref(42)
const sit  = ref(45)
const runSec = ref(660)

const pushPts = computed(() => scoreReps(push.value, ageBandVal.value, 'push'))
const sitPts  = computed(() => scoreReps(sit.value,  ageBandVal.value, 'sit'))
const runPts  = computed(() => scoreRun(runSec.value, ageBandVal.value))
const total   = computed(() => pushPts.value + sitPts.value + runPts.value)
const tier    = computed(() => tierOf(total.value))
const next    = computed(() => {
  const n = nextTierInfo(total.value)
  if (!n) return null
  return { name: n.name, pts: n.threshold - total.value, hint: `${n.threshold - total.value} more pts needed` }
})

const BANDS: { id: AgeBand; label: string }[] = [
  { id: 'young',  label: 'Young (≤ 30)' },
  { id: 'mid',    label: 'Mid (31–40)' },
  { id: 'senior', label: 'Senior (41+)' },
]

const TIER_CUTS = [51, 61, 75, 85]

function gaugeOffset(val: number, max: number, size: number) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  return circ - (val / max) * circ
}

function tierX(cut: number, max: number, size: number) {
  const r = (size / 2) - 8
  const angle = ((cut / max) * 360 - 90) * (Math.PI / 180)
  return size / 2 + (r - 4) * Math.cos(angle)
}
function tierY(cut: number, max: number, size: number) {
  const r = (size / 2) - 8
  const angle = ((cut / max) * 360 - 90) * (Math.PI / 180)
  return size / 2 + (r - 4) * Math.sin(angle)
}
function tierX2(cut: number, max: number, size: number) {
  const r = (size / 2) - 8
  const angle = ((cut / max) * 360 - 90) * (Math.PI / 180)
  return size / 2 + (r + 4) * Math.cos(angle)
}
function tierY2(cut: number, max: number, size: number) {
  const r = (size / 2) - 8
  const angle = ((cut / max) * 360 - 90) * (Math.PI / 180)
  return size / 2 + (r + 4) * Math.sin(angle)
}

const GS = 180
const GR = computed(() => GS / 2 - 8)
const GC = computed(() => 2 * Math.PI * GR.value)
const tierColor = computed(() => {
  const k = tier.value.key
  if (k === 'gold') return 'var(--gold)'
  if (k === 'silver') return 'var(--silver)'
  if (k === 'pass') return 'var(--success)'
  return 'var(--ink-muted)'
})
</script>

<template>
  <div class="col gap-5" style="padding:24px 24px 48px">
    <!-- Header -->
    <div>
      <div class="h2">Score calculator</div>
      <div class="text-sm muted" style="margin-top:4px">Explore your score without logging a session</div>
    </div>

    <div :class="mobile ? 'col gap-5' : 'row gap-5'" style="align-items:flex-start">
      <!-- Left: sliders -->
      <div class="col gap-4" style="flex:1;min-width:0">

        <!-- Age band -->
        <div class="col gap-2">
          <div class="label">Age band</div>
          <div class="seg">
            <button v-for="b in BANDS" :key="b.id" :class="{ active: ageBandVal === b.id }" @click="ageBandVal = b.id">{{ b.label }}</button>
          </div>
        </div>

        <!-- Push-ups -->
        <div class="card col gap-3" style="padding:20px">
          <div class="row between">
            <div class="col" style="gap:2px">
              <div class="label">Push-ups</div>
              <div class="text-xs muted">Max 25 pts</div>
            </div>
            <div class="row gap-2" style="align-items:baseline">
              <div class="mono" style="font-size:28px;font-weight:700;color:var(--primary-2)">{{ pushPts }}</div>
              <div class="text-sm muted">pts</div>
            </div>
          </div>
          <input class="slider" type="range" min="0" max="60" v-model.number="push" />
          <div class="row between">
            <div class="text-sm muted">{{ push }} reps</div>
            <div class="bar" style="flex:1;margin:0 12px">
              <div class="fill" :style="`width:${(pushPts/25)*100}%`" />
            </div>
            <div class="text-xs muted">25</div>
          </div>
        </div>

        <!-- Sit-ups -->
        <div class="card col gap-3" style="padding:20px">
          <div class="row between">
            <div class="col" style="gap:2px">
              <div class="label">Sit-ups</div>
              <div class="text-xs muted">Max 25 pts</div>
            </div>
            <div class="row gap-2" style="align-items:baseline">
              <div class="mono" style="font-size:28px;font-weight:700;color:var(--primary-2)">{{ sitPts }}</div>
              <div class="text-sm muted">pts</div>
            </div>
          </div>
          <input class="slider" type="range" min="0" max="60" v-model.number="sit" />
          <div class="row between">
            <div class="text-sm muted">{{ sit }} reps</div>
            <div class="bar" style="flex:1;margin:0 12px">
              <div class="fill" :style="`width:${(sitPts/25)*100}%`" />
            </div>
            <div class="text-xs muted">25</div>
          </div>
        </div>

        <!-- Run -->
        <div class="card col gap-3" style="padding:20px">
          <div class="row between">
            <div class="col" style="gap:2px">
              <div class="label">2.4km run</div>
              <div class="text-xs muted">Max 50 pts</div>
            </div>
            <div class="row gap-2" style="align-items:baseline">
              <div class="mono" style="font-size:28px;font-weight:700;color:var(--primary-2)">{{ runPts }}</div>
              <div class="text-sm muted">pts</div>
            </div>
          </div>
          <input class="slider" type="range" min="540" max="1200" step="5" v-model.number="runSec" />
          <div class="row between">
            <div class="text-sm mono text-sm">{{ fmtTime(runSec) }}</div>
            <div class="bar" style="flex:1;margin:0 12px">
              <div class="fill" :style="`width:${(runPts/50)*100}%`" />
            </div>
            <div class="text-xs muted">50</div>
          </div>
        </div>
      </div>

      <!-- Right: result card -->
      <div class="col gap-3" :style="mobile ? '' : 'width:280px;position:sticky;top:24px'">
        <div class="card dark col gap-4" style="padding:24px;align-items:center">
          <!-- SVG gauge -->
          <div style="position:relative">
            <svg :width="GS" :height="GS" :viewBox="`0 0 ${GS} ${GS}`">
              <!-- Track -->
              <circle
                :cx="GS/2" :cy="GS/2" :r="GR"
                fill="none" stroke="rgba(255,255,255,0.1)" :stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="GC" :stroke-dashoffset="0"
                style="transform:rotate(-90deg);transform-origin:50% 50%"
              />
              <!-- Fill -->
              <circle
                :cx="GS/2" :cy="GS/2" :r="GR"
                fill="none" :stroke="tierColor" :stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="GC" :stroke-dashoffset="gaugeOffset(total, 100, GS)"
                style="transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dashoffset .4s,stroke .3s"
              />
              <!-- Tier notch lines -->
              <line v-for="cut in TIER_CUTS" :key="cut"
                :x1="tierX(cut,100,GS)" :y1="tierY(cut,100,GS)"
                :x2="tierX2(cut,100,GS)" :y2="tierY2(cut,100,GS)"
                stroke="rgba(255,255,255,0.4)" stroke-width="2"
              />
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px">
              <div class="mono" style="font-size:44px;font-weight:700;line-height:1">{{ total }}</div>
              <div style="font-size:12px;opacity:0.5">/ 100</div>
            </div>
          </div>

          <div class="tier-pill" :class="tier.key" style="font-size:13px;padding:6px 16px">{{ tier.name }}</div>

          <!-- Station breakdown -->
          <div class="col gap-2" style="width:100%;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1)">
            <div v-for="row in [
              { label: 'Push-ups', pts: pushPts, max: 25 },
              { label: 'Sit-ups',  pts: sitPts,  max: 25 },
              { label: '2.4km',    pts: runPts,   max: 50 },
            ]" :key="row.label" class="row gap-3" style="align-items:center">
              <div class="text-sm" style="width:68px;opacity:.7">{{ row.label }}</div>
              <div style="flex:1;height:4px;background:rgba(255,255,255,0.12);border-radius:2px;overflow:hidden">
                <div :style="`width:${(row.pts/row.max)*100}%;height:100%;background:var(--primary-2);border-radius:2px;transition:width .3s`" />
              </div>
              <div class="mono text-sm" style="width:36px;text-align:right;opacity:.85">{{ row.pts }}</div>
            </div>
          </div>

          <!-- Next tier coaching -->
          <div v-if="next" style="width:100%;padding:12px;background:rgba(255,255,255,0.06);border-radius:10px" class="col gap-1">
            <div class="text-xs" style="opacity:.5;text-transform:uppercase;letter-spacing:.08em">Next tier</div>
            <div class="text-sm" style="font-weight:600">{{ next.name }} — {{ next.pts }} more pts</div>
            <div class="text-xs" style="opacity:.6">{{ next.hint }}</div>
          </div>
          <div v-else style="width:100%;padding:12px;background:rgba(255,255,255,0.06);border-radius:10px">
            <div class="text-sm" style="font-weight:600">★ Gold + Incentive achieved!</div>
          </div>
        </div>

        <!-- Tier thresholds reference -->
        <div class="card flat col gap-2" style="padding:16px">
          <div class="label" style="margin-bottom:4px">Score thresholds</div>
          <div v-for="t in [{ label:'Gold + Incentive', cut:85, cls:'gold' },{ label:'Gold', cut:75, cls:'gold' },{ label:'Silver', cut:61, cls:'silver' },{ label:'Pass', cut:51, cls:'pass' }]" :key="t.cut"
            class="row between" style="font-size:13px">
            <div class="row gap-2" style="align-items:center">
              <div class="tier-pill" :class="t.cls" style="font-size:10px;padding:2px 7px">{{ t.label }}</div>
            </div>
            <div class="mono text-sm">≥ {{ t.cut }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
