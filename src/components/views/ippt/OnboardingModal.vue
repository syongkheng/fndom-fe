<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIpptStore } from '@/stores/ippt'
import { ageBand, scoreReps, scoreRun } from '@/utilities/ipptScoring'
import IpptIcon from './IpptIcon.vue'

defineProps<{ mobile: boolean }>()
const emit = defineEmits<{ done: [] }>()

const store = useIpptStore()

const step = ref(0)
const goal = ref<'pass' | 'silver' | 'gold' | 'incentive'>('gold')
const age = ref(28)
const height = ref(174)
const weight = ref(70)
const basePush = ref(35)
const baseSit  = ref(38)
const baseRun  = ref(720)

const heroCopy = [
  { eyebrow: 'GET IPPT READY', headline: "You've got 53 days.\nLet's make them count.", sub: "Strider plans your training, tracks your reps, and projects your score — so you walk into test day knowing exactly what you can hit." },
  { eyebrow: 'STEP 1 OF 3',   headline: "What's your target?",    sub: "We'll back-solve a plan to get there. You can change this anytime." },
  { eyebrow: 'STEP 2 OF 3',   headline: "A bit about you",        sub: "Age affects your scoring bands. Height and weight are optional — they help with calorie targets." },
  { eyebrow: 'STEP 3 OF 3',   headline: "Where are you starting?",sub: "Best guess is fine. Strider re-baselines after your first logged session." },
]

const GOALS = [
  { id: 'pass',      badge: '✓', title: 'Pass',              desc: 'Score ≥ 51 — clear the bar.' },
  { id: 'silver',    badge: 'S', title: 'Silver',            desc: 'Score ≥ 61 — a tidy result.' },
  { id: 'gold',      badge: 'G', title: 'Gold',              desc: 'Score ≥ 75 — the popular target.' },
  { id: 'incentive', badge: '★', title: 'Gold + Incentive',  desc: 'Score ≥ 85 — the full bonus payout.' },
]

const projScore = computed(() => {
  const band = ageBand(age.value)
  return scoreReps(basePush.value, band, 'push') + scoreReps(baseSit.value, band, 'sit') + scoreRun(baseRun.value, band)
})

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function next() {
  if (step.value < 3) { step.value++; return }
  const band = ageBand(age.value)
  store.setProfile({ name: 'Jordan', age: age.value, height: height.value, weight: weight.value, joined: 'Mar 2026', goalTier: goal.value === 'incentive' ? 'gold' : goal.value, testDate: 'Jul 18', daysToTest: 53 })
  store.logSession({ id: crypto.randomUUID(), type: 'push', value: basePush.value, pts: scoreReps(basePush.value, band, 'push'), date: new Date().toISOString().slice(0, 10), note: 'Baseline' })
  store.logSession({ id: crypto.randomUUID(), type: 'sit',  value: baseSit.value,  pts: scoreReps(baseSit.value,  band, 'sit'),  date: new Date().toISOString().slice(0, 10), note: 'Baseline' })
  store.logSession({ id: crypto.randomUUID(), type: 'run',  value: baseRun.value,  pts: scoreRun(baseRun.value, band),            date: new Date().toISOString().slice(0, 10), note: 'Baseline' })
  store.setOnboarded(true)
  emit('done')
}

const c = computed(() => heroCopy[step.value])
</script>

<template>
  <div class="onboard">
    <!-- Hero panel -->
    <div class="onboard-hero" :style="{ minHeight: mobile ? '300px' : '240px' }">
      <div class="col gap-4" style="position:relative;z-index:2">
        <div class="row gap-2" style="align-items:center">
          <div style="width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,0.18);display:grid;place-items:center;font-weight:700;font-size:13px;color:var(--primary-ink);flex-shrink:0">S</div>
          <div style="font-weight:700;letter-spacing:-0.01em;color:var(--primary-ink)">Strider</div>
        </div>
        <div class="steps" style="max-width:220px">
          <i v-for="i in 4" :key="i" :class="{ done: i-1 < step, active: i-1 === step }" />
        </div>
      </div>
      <div class="col gap-3" style="position:relative;z-index:2;margin-top:36px">
        <div style="font-size:11px;letter-spacing:0.1em;opacity:0.85;color:var(--primary-ink)">{{ c.eyebrow }}</div>
        <h1 style="font-size:28px;font-weight:700;letter-spacing:-0.02em;line-height:1.1;margin:0;white-space:pre-line;color:var(--primary-ink)">{{ c.headline }}</h1>
        <p style="font-size:13.5px;line-height:1.55;opacity:0.92;margin:0;max-width:460px;color:var(--primary-ink)">{{ c.sub }}</p>
      </div>
    </div>

    <!-- Body -->
    <div class="onboard-body">

      <!-- Step 0: welcome -->
      <div v-if="step === 0" class="col gap-4">
        <div class="col gap-3">
          <div v-for="f in [
            { icon:'target', title:'Track all 3 stations', desc:'Push-ups, sit-ups, 2.4 km run — with live IPPT scoring.' },
            { icon:'cal',    title:'Plan your weeks',      desc:'A 6-week plan that adapts to your logged effort.' },
            { icon:'pin',    title:'Book NS Fit',          desc:'Find sessions near you. Strider syncs to your calendar.' },
            { icon:'medal',  title:'Earn rewards',         desc:'Hit Silver, Gold, and Gold + Incentive milestones.' },
          ]" :key="f.title" class="row gap-3" style="align-items:flex-start">
            <div style="width:36px;height:36px;border-radius:10px;background:var(--primary-tint);color:var(--primary-2);display:grid;place-items:center;flex-shrink:0">
              <IpptIcon :name="f.icon" :size="18" />
            </div>
            <div class="col" style="gap:2px">
              <div style="font-size:14px;font-weight:600">{{ f.title }}</div>
              <div class="text-xs muted">{{ f.desc }}</div>
            </div>
          </div>
        </div>
        <div class="card flat" style="flex-direction:row;align-items:center;gap:12px;padding:14px">
          <IpptIcon name="info" :size="18" style="color:var(--ink-muted);flex-shrink:0" />
          <div class="text-sm muted">No account needed to explore — sign up before logging your first session.</div>
        </div>
      </div>

      <!-- Step 1: goal -->
      <div v-else-if="step === 1" class="col gap-3">
        <div
          v-for="o in GOALS" :key="o.id"
          class="choice" :class="{ selected: goal === o.id }"
          @click="goal = o.id as any"
        >
          <div class="badge">{{ o.badge }}</div>
          <div class="col grow" style="gap:2px">
            <div class="title">{{ o.title }}</div>
            <div class="desc">{{ o.desc }}</div>
          </div>
          <IpptIcon v-if="goal === o.id" name="check" :size="18" style="color:var(--primary-2)" />
        </div>
      </div>

      <!-- Step 2: profile -->
      <div v-else-if="step === 2" class="col gap-4">
        <div class="col gap-2">
          <label class="label">Age</label>
          <div class="row gap-3">
            <input class="input" type="number" v-model.number="age" style="max-width:120px" />
            <div class="text-sm muted" style="align-self:center">
              {{ age <= 30 ? 'Age band: under 30' : age <= 40 ? 'Age band: 31–40' : 'Age band: 41+' }}
            </div>
          </div>
        </div>
        <div class="grid grid-2" style="gap:16px">
          <div class="col gap-2">
            <label class="label">Height (cm)</label>
            <input class="input" type="number" v-model.number="height" />
          </div>
          <div class="col gap-2">
            <label class="label">Weight (kg)</label>
            <input class="input" type="number" v-model.number="weight" />
          </div>
        </div>
      </div>

      <!-- Step 3: baseline -->
      <div v-else-if="step === 3" class="col gap-4">
        <div class="col gap-2">
          <div class="row between">
            <label class="label">Push-ups (1 min)</label>
            <div class="mono text-sm">{{ basePush }} reps</div>
          </div>
          <input class="slider" type="range" min="0" max="60" v-model.number="basePush" />
        </div>
        <div class="col gap-2">
          <div class="row between">
            <label class="label">Sit-ups (1 min)</label>
            <div class="mono text-sm">{{ baseSit }} reps</div>
          </div>
          <input class="slider" type="range" min="0" max="60" v-model.number="baseSit" />
        </div>
        <div class="col gap-2">
          <div class="row between">
            <label class="label">2.4 km run</label>
            <div class="mono text-sm">{{ fmtTime(baseRun) }}</div>
          </div>
          <input class="slider" type="range" min="540" max="1080" step="5" v-model.number="baseRun" />
        </div>
        <div class="card flat" style="flex-direction:row;gap:12px;align-items:center;padding:14px">
          <IpptIcon name="target" :size="18" style="color:var(--ink-muted);flex-shrink:0" />
          <div class="text-sm">
            <b>Projected starting score:</b>
            <span class="mono" style="margin-left:6px">{{ projScore }}</span>
            <span class="muted" style="margin-left:4px">/ 100</span>
          </div>
        </div>
      </div>

      <!-- Nav row -->
      <div class="row" style="gap:12px;margin-top:24px">
        <button v-if="step > 0" class="btn ghost" @click="step--">Back</button>
        <div class="grow" />
        <button v-if="step === 0" class="btn ghost" @click="emit('done')">Skip for now</button>
        <button class="btn primary" @click="next">
          {{ step === 0 ? 'Get started' : step === 3 ? 'Open Strider' : 'Continue' }}
          <IpptIcon name="arr" :size="16" :stroke="2" />
        </button>
      </div>
    </div>
  </div>
</template>
