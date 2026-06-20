<script setup lang="ts">
import { computed } from 'vue'
import { useIpptStore } from '@/stores/ippt'
import { ageBand, tierOf, fmtTime } from '@/utilities/ipptScoring'
import IpptIcon from './IpptIcon.vue'

const props = defineProps<{ mobile: boolean }>()
const emit = defineEmits<{ go: [tab: string]; toast: [msg: string] }>()

const store = useIpptStore()
const profile = computed(() => store.profile)
const bd = computed(() => store.breakdown)
const projected = computed(() => store.projectedScore)
const tier = computed(() => tierOf(projected.value))

const GAUGE_SIZE = computed(() => props.mobile ? 168 : 200)

function gaugeProps(value: number, max: number, size: number) {
  const stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  return { r, c, offset: c * (1 - pct), cx: size / 2, cy: size / 2, stroke, size }
}

function tierMark(t: number, max: number, size: number) {
  const stroke = 14, r = (size - stroke) / 2
  const a = (t / max) * Math.PI * 2 - Math.PI / 2
  const cx = size / 2, cy = size / 2
  return {
    x1: cx + Math.cos(a) * (r - stroke / 2 - 2),
    y1: cy + Math.sin(a) * (r - stroke / 2 - 2),
    x2: cx + Math.cos(a) * (r + stroke / 2 + 2),
    y2: cy + Math.sin(a) * (r + stroke / 2 + 2),
  }
}

const trend = computed(() => [42, 44, 47, 46, 50, 53, 55, 58, 60, 62, 61, 64, 66, projected.value])
const trendDelta = computed(() => trend.value[trend.value.length - 1] - trend.value[0])

function sparkPaths(values: number[], w = 300, h = 60) {
  if (values.length < 2) return { line: '', fill: '', lx: 0, ly: 0 }
  const max = Math.max(...values), min = Math.min(...values), range = max - min || 1
  const step = w / (values.length - 1)
  const pts = values.map((v, i) => [i * step, h - 6 - ((v - min) / range) * (h - 14)] as [number,number])
  const d = pts.map(([x,y], i) => `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return { line: d, fill: `${d} L${w},${h} L0,${h} Z`, lx, ly }
}

const weekProgress = computed(() => {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i))
    return Math.min(4, store.activity.filter(a => a.date === d.toISOString().slice(0, 10)).length)
  })
})

const streakDays = computed(() => {
  let count = 0
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    if (store.activity.some(a => a.date === d.toISOString().slice(0, 10))) count++
    else if (i > 0) break
  }
  return count
})

const weekSessions = computed(() => {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
  return store.activity.filter(a => new Date(a.date) >= cutoff).length
})

const DOW = ['M','T','W','T','F','S','S']

const NEXT_SESSION = { label: 'NS Fit — Maju', location: 'Bukit Timah', time: '07:30', when: 'Thu 28 May', kind: 'nsfit' }

const coachTip = computed(() => {
  const { push, sit, run } = bd.value
  const weakest = push <= sit && push <= run ? 'push-ups' : sit <= push && sit <= run ? 'sit-ups' : 'run'
  return `Your run is doing the heavy lifting. Push-ups are leaving ${25 - push} points on the table — try 5×submax with 90s rest tomorrow.`
})
</script>

<template>
  <div class="col gap-5">

    <!-- Hero row: gauge + next session -->
    <div :class="['grid', mobile ? '' : 'grid-2']" style="gap:16px">

      <!-- Projected score card -->
      <div class="card">
        <div class="card-eyebrow">
          <span>Projected IPPT score</span>
          <span class="tag primary">{{ profile.daysToTest }}d to test</span>
        </div>
        <div :class="['row gap-6', mobile ? 'col' : '']" style="align-items:center">
          <!-- Gauge SVG -->
          <div class="gauge-wrap" :style="{ width: GAUGE_SIZE + 'px', height: GAUGE_SIZE + 'px' }">
            <svg :width="GAUGE_SIZE" :height="GAUGE_SIZE" :viewBox="`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`" style="transform:rotate(-90deg)">
              <circle :cx="gaugeProps(projected, 100, GAUGE_SIZE).cx" :cy="gaugeProps(projected, 100, GAUGE_SIZE).cy"
                :r="gaugeProps(projected, 100, GAUGE_SIZE).r" fill="none" stroke="var(--border)"
                :stroke-width="gaugeProps(projected, 100, GAUGE_SIZE).stroke" />
              <circle :cx="gaugeProps(projected, 100, GAUGE_SIZE).cx" :cy="gaugeProps(projected, 100, GAUGE_SIZE).cy"
                :r="gaugeProps(projected, 100, GAUGE_SIZE).r" fill="none"
                :stroke="tier.color" :stroke-width="gaugeProps(projected, 100, GAUGE_SIZE).stroke"
                stroke-linecap="round"
                :stroke-dasharray="gaugeProps(projected, 100, GAUGE_SIZE).c"
                :stroke-dashoffset="gaugeProps(projected, 100, GAUGE_SIZE).offset"
                style="transition:stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)" />
              <line v-for="t in [51, 61, 75, 85]" :key="t"
                :x1="tierMark(t, 100, GAUGE_SIZE).x1" :y1="tierMark(t, 100, GAUGE_SIZE).y1"
                :x2="tierMark(t, 100, GAUGE_SIZE).x2" :y2="tierMark(t, 100, GAUGE_SIZE).y2"
                stroke="var(--ink-faint)" stroke-width="1" />
            </svg>
            <div class="center">
              <div class="gauge-num">{{ projected }}</div>
              <div class="gauge-sub">/ 100</div>
            </div>
          </div>

          <!-- Right col: tier + breakdown -->
          <div class="col gap-4 grow" :style="{ width: mobile ? '100%' : 'auto' }">
            <span class="tier-pill" :class="tier.key">
              <span class="dot">{{ tier.key === 'gold' ? '★' : tier.key === 'silver' ? '✓' : tier.key === 'pass' ? '✓' : '·' }}</span>
              {{ tier.name }}
            </span>
            <div class="col gap-3">
              <div v-for="s in [{ label:'Push-ups', pts: bd.push, max: 25 }, { label:'Sit-ups', pts: bd.sit, max: 25 }, { label:'2.4 km', pts: bd.run, max: 50 }]" :key="s.label" class="col gap-2">
                <div class="row between">
                  <div class="text-xs muted" style="font-weight:600;letter-spacing:0.04em;text-transform:uppercase;white-space:nowrap">{{ s.label }}</div>
                  <div class="mono text-sm" style="font-weight:600">{{ s.pts }}<span style="color:var(--ink-faint)">/{{ s.max }}</span></div>
                </div>
                <div class="bar"><i :style="{ width: `${(s.pts / s.max) * 100}%` }" /></div>
              </div>
            </div>
            <div class="text-xs muted">
              <IpptIcon name="arrUp" :size="12" :stroke="2.4" style="color:var(--success);vertical-align:-2px;margin-right:4px" />
              <span style="color:var(--success);font-weight:600">+{{ trendDelta }} pts</span> since last week.
              {{ projected >= 85 ? 'Already past Incentive. Lock it in.' : projected >= 75 ? `You're ${85 - projected} away from Gold + Incentive.` : `You're ${75 - projected} away from Gold.` }}
            </div>
          </div>
        </div>
      </div>

      <!-- Right col: next session + streak -->
      <div class="col gap-4">
        <div class="card">
          <div class="card-eyebrow">
            <span>Next session</span>
            <span>{{ NEXT_SESSION.when }}</span>
          </div>
          <div class="row gap-3" style="align-items:center">
            <div style="width:44px;height:44px;border-radius:12px;background:var(--accent-tint);color:oklch(0.4 0.1 60);display:grid;place-items:center;flex-shrink:0">
              <IpptIcon name="pin" :size="20" />
            </div>
            <div class="col grow">
              <div style="font-size:15px;font-weight:700;letter-spacing:-0.005em">{{ NEXT_SESSION.label }}</div>
              <div class="text-xs muted">{{ NEXT_SESSION.location }} · {{ NEXT_SESSION.time }}</div>
            </div>
            <button class="btn sm" @click="emit('go', 'schedule')">Details</button>
          </div>
          <div class="divider" />
          <div class="col gap-2">
            <div class="text-xs muted" style="font-weight:600;letter-spacing:0.04em;text-transform:uppercase">This week</div>
            <div class="streak" style="margin-bottom:18px">
              <div v-for="(lvl, i) in weekProgress" :key="i" :class="`blk lv${lvl}`">
                <span class="lbl">{{ DOW[i] }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-2" style="gap:12px">
          <div class="card tight">
            <div class="text-xs muted" style="font-weight:600;letter-spacing:0.04em;text-transform:uppercase">Streak</div>
            <div class="row gap-2" style="align-items:baseline">
              <div class="mono" style="font-size:26px;font-weight:600;letter-spacing:-0.02em">{{ streakDays }}</div>
              <div class="text-xs muted">days</div>
              <IpptIcon name="flame" :size="16" :stroke="2" style="color:var(--accent);margin-left:auto" />
            </div>
          </div>
          <div class="card tight">
            <div class="text-xs muted" style="font-weight:600;letter-spacing:0.04em;text-transform:uppercase">Logged this week</div>
            <div class="row gap-2" style="align-items:baseline">
              <div class="mono" style="font-size:26px;font-weight:600;letter-spacing:-0.02em">{{ weekSessions }}</div>
              <div class="text-xs muted">sessions</div>
              <IpptIcon name="bolt" :size="16" :stroke="2" style="color:var(--primary);margin-left:auto" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick log -->
    <div class="card tight">
      <div class="card-eyebrow"><span>Quick log</span><span>Tap to record</span></div>
      <div class="grid grid-4" style="gap:10px">
        <button v-for="q in [
          { label:'Push-ups', icon:'bolt',   station:'push' },
          { label:'Sit-ups',  icon:'target', station:'sit' },
          { label:'2.4km run',icon:'run',    station:'run' },
          { label:'NS Fit',   icon:'pin',    muted:true },
        ]" :key="q.label" class="card tight" style="cursor:default;padding:14px;gap:8px;align-items:flex-start"
          @click="q.muted ? emit('go','schedule') : emit('go','log')">
          <div class="row between" style="width:100%">
            <div :style="`width:32px;height:32px;border-radius:8px;display:grid;place-items:center;background:${q.muted ? 'var(--bg-deep)' : 'var(--primary-tint)'};color:${q.muted ? 'var(--ink-muted)' : 'var(--primary-2)'}`">
              <IpptIcon :name="q.icon" :size="16" />
            </div>
            <IpptIcon name="plus" :size="16" :stroke="2.2" style="color:var(--ink-faint)" />
          </div>
          <div style="font-size:12.5px;font-weight:600">{{ q.label }}</div>
        </button>
      </div>
    </div>

    <!-- Recent activity + score trend -->
    <div :class="['grid', mobile ? '' : 'grid-2']" style="gap:16px">
      <div class="card">
        <div class="section-head">
          <div class="section-head-left">
            <div class="h2">Recent activity</div>
          </div>
          <button class="btn ghost sm" @click="emit('go','plan')">View all</button>
        </div>
        <div class="col">
          <div v-for="a in store.activity.slice(0,5)" :key="a.id" class="activity">
            <div :class="`ico ${a.type}`">
              <IpptIcon :name="a.type==='run'?'run':a.type==='push'?'bolt':'target'" :size="18" />
            </div>
            <div>
              <div class="name">{{ a.type==='push'?'Push-ups':a.type==='sit'?'Sit-ups':a.type==='run'?'2.4km run':'NS Fit' }}</div>
              <div class="meta">{{ a.date }}{{ a.note ? ` · ${a.note}` : '' }}</div>
            </div>
            <div class="right">
              <span>{{ a.type==='run' ? fmtTime(a.value) : a.value }}<span style="font-size:11px;color:var(--ink-faint);margin-left:4px">{{ a.type!=='run' ? 'reps' : '' }}</span></span>
              <span class="pts">{{ a.pts != null ? `${a.pts} pts` : a.type.toUpperCase() }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-head">
          <div class="section-head-left">
            <div class="h2">Score trend</div>
            <div class="text-xs muted">Last 14 logged sessions</div>
          </div>
        </div>
        <svg class="spark" viewBox="0 0 300 60" preserveAspectRatio="none" style="height:60px">
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.15"/>
              <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path :d="sparkPaths(trend).fill" fill="url(#spark-fill)" />
          <path :d="sparkPaths(trend).line" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <circle :cx="sparkPaths(trend).lx" :cy="sparkPaths(trend).ly" r="3.5" fill="#fff" stroke="var(--primary)" stroke-width="2" />
        </svg>
        <div class="row between text-xs muted"><span>Mar</span><span>Apr</span><span>May</span><span>Today</span></div>
        <div class="divider" />
        <div class="row gap-4">
          <div v-for="s in [
            { k:'14-day Δ', v:`+${trendDelta}`, u:'points', color:'var(--success)' },
            { k:'To Gold',  v:`${Math.max(0,75-projected)}`, u:'pts' },
            { k:'Best run', v:'10:54', u:'' },
          ]" :key="s.k" class="col" style="gap:2px;flex:1">
            <div class="text-xs muted" style="font-weight:600;letter-spacing:0.04em;text-transform:uppercase">{{ s.k }}</div>
            <div class="row gap-2" style="align-items:baseline">
              <div class="mono" style="font-size:18px;font-weight:600" :style="s.color ? { color: s.color } : {}">{{ s.v }}</div>
              <div v-if="s.u" class="text-xs muted">{{ s.u }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Coaching tip (dark card) -->
    <div class="card dark">
      <div class="row gap-3" style="align-items:flex-start">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.08);display:grid;place-items:center;flex-shrink:0">
          <IpptIcon name="bolt" :size="18" />
        </div>
        <div class="col grow" style="gap:6px">
          <div style="font-size:11px;letter-spacing:0.08em;opacity:0.7;text-transform:uppercase">Coach tip</div>
          <div style="font-size:14.5px;font-weight:500;line-height:1.5">
            Your run is doing the heavy lifting. Push-ups are leaving
            <span style="color:var(--accent)">{{ 25 - bd.push }} points</span> on the table — try 5×submax with 90s rest tomorrow.
          </div>
          <div class="row gap-2" style="margin-top:4px">
            <button class="btn accent sm" @click="emit('toast','Drill added to Thursday.')">Add to plan</button>
            <button class="btn ghost sm" style="color:rgba(245,244,238,0.8)" @click="emit('go','plan')">See plan</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
