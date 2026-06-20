<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIpptStore } from '@/stores/ippt'
import { ageBand, scoreReps, scoreRun, tierOf, fmtTime } from '@/utilities/ipptScoring'
import IpptIcon from './IpptIcon.vue'

const props = defineProps<{ mobile: boolean }>()
const emit = defineEmits<{ go: [tab: string]; toast: [msg: string] }>()

const store = useIpptStore()

type Station = 'push' | 'sit' | 'run'
const station = ref<Station>('push')
const reps = ref(35)
const runMode = ref<'total' | 'laps'>('total')
const runMin = ref(11)
const runSec = ref(0)
const laps = ref([[1,48],[1,50],[1,52],[1,54],[1,53],[1,43]])
const note = ref('')
const intensity = ref<'easy' | 'tempo' | 'race'>('tempo')

const band = computed(() => ageBand(store.profile?.age ?? 28))

const totalSec = computed(() => {
  if (runMode.value === 'total') return runMin.value * 60 + runSec.value
  return laps.value.reduce((s, [m, x]) => s + m * 60 + x, 0)
})

const avgLapSec = computed(() => Math.round(totalSec.value / 6))

const pts = computed(() => {
  if (station.value === 'run') return scoreRun(totalSec.value, band.value)
  return scoreReps(reps.value, band.value, station.value)
})

const ptsMax = computed(() => station.value === 'run' ? 50 : 25)

const valueLabel = computed(() => {
  if (station.value === 'run') return fmtTime(totalSec.value)
  return `${reps.value} reps`
})

const projTotal = computed(() => {
  const b = store.breakdown
  if (station.value === 'push') return pts.value + b.sit + b.run
  if (station.value === 'sit') return b.push + pts.value + b.run
  return b.push + b.sit + pts.value
})

const lapSecs = computed(() => laps.value.map(([m, s]) => m * 60 + s))
const lapFastest = computed(() => Math.min(...lapSecs.value))
const lapSlowest = computed(() => Math.max(...lapSecs.value))
const lapSpan = computed(() => Math.max(lapSlowest.value - lapFastest.value, 1))

function lapIsFastest(i: number) { return lapSecs.value[i] === lapFastest.value }
function lapIsSlowest(i: number) { return lapSecs.value[i] === lapSlowest.value }

function lapDevBarH(sec: number): number {
  const avg = avgLapSec.value
  const max = lapSpan.value
  return Math.round(Math.abs(sec - avg) / max * 28)
}
function lapIsOver(sec: number): boolean { return sec > avgLapSec.value }

function updateLap(idx: number, part: 0 | 1, val: number) {
  const clone = laps.value.map(l => [...l] as [number, number])
  clone[idx][part] = val
  laps.value = clone
}

function save() {
  const date = new Date().toISOString().slice(0, 10)
  const id = crypto.randomUUID()
  if (station.value === 'run') {
    store.logSession({ id, type: 'run', value: totalSec.value, pts: pts.value, date, note: note.value || undefined })
  } else {
    store.logSession({ id, type: station.value, value: reps.value, pts: pts.value, date, note: note.value || undefined })
  }
  emit('toast', 'Session saved')
  emit('go', 'dashboard')
}
</script>

<template>
  <div class="col gap-5" style="padding:24px 24px 48px">
    <!-- Header -->
    <div>
      <div class="h2">Log a session</div>
      <div class="text-sm muted" style="margin-top:4px">Record your IPPT station result</div>
    </div>

    <div :class="mobile ? 'col gap-5' : 'row gap-5'" style="align-items:flex-start">
      <!-- Left: inputs -->
      <div class="col gap-4" style="flex:1;min-width:0">

        <!-- Station picker -->
        <div class="col gap-2">
          <div class="label">Station</div>
          <div class="row gap-3">
            <button
              v-for="s in (['push','sit','run'] as Station[])" :key="s"
              class="card" style="flex:1;padding:14px 10px;align-items:center;gap:6px;cursor:pointer;transition:all .15s"
              :style="station === s ? 'border-color:var(--primary-2);background:var(--primary-tint);box-shadow:0 0 0 2px var(--primary-2)20' : ''"
              @click="station = s"
            >
              <IpptIcon :name="s === 'run' ? 'run' : s === 'push' ? 'arr' : 'target'" :size="20" :style="station===s ? 'color:var(--primary-2)' : 'color:var(--ink-muted)'" />
              <div class="text-sm" style="font-weight:600;text-transform:capitalize">{{ s === 'push' ? 'Push-ups' : s === 'sit' ? 'Sit-ups' : '2.4km Run' }}</div>
            </button>
          </div>
        </div>

        <!-- Push / Sit -->
        <div v-if="station !== 'run'" class="card col gap-4" style="padding:20px">
          <div class="col gap-2">
            <div class="row between">
              <label class="label">{{ station === 'push' ? 'Push-ups' : 'Sit-ups' }} (1 min)</label>
              <div class="mono" style="font-size:22px;font-weight:700;color:var(--primary-2)">{{ reps }}</div>
            </div>
            <input class="slider" type="range" min="0" max="60" v-model.number="reps" />
            <div class="row gap-2" style="flex-wrap:wrap">
              <button v-for="preset in [20,30,40,50]" :key="preset"
                class="btn ghost" style="padding:4px 12px;font-size:13px"
                :style="reps===preset ? 'background:var(--primary-tint);border-color:var(--primary-2);color:var(--primary-2)' : ''"
                @click="reps=preset">{{ preset }}</button>
            </div>
          </div>
          <div class="row between" style="padding:12px;background:var(--surface-2);border-radius:10px">
            <div class="text-sm muted">Points scored</div>
            <div class="mono" style="font-weight:700;font-size:18px">{{ pts }} <span class="muted" style="font-size:13px">/ 25</span></div>
          </div>
        </div>

        <!-- Run -->
        <div v-else class="card col gap-4" style="padding:20px">
          <!-- Mode seg -->
          <div class="seg" style="align-self:flex-start">
            <button :class="{ active: runMode === 'total' }" @click="runMode='total'">Total time</button>
            <button :class="{ active: runMode === 'laps' }" @click="runMode='laps'">Lap splits</button>
          </div>

          <!-- Total mode -->
          <div v-if="runMode === 'total'" class="col gap-3">
            <div class="label">Time (mm:ss)</div>
            <div class="row gap-3" style="align-items:center">
              <input class="input mono" type="number" min="6" max="20" v-model.number="runMin" style="width:80px;font-size:24px;font-weight:700;text-align:center" />
              <div style="font-size:24px;font-weight:700;color:var(--ink-muted)">:</div>
              <input class="input mono" type="number" min="0" max="59" v-model.number="runSec" style="width:80px;font-size:24px;font-weight:700;text-align:center" />
            </div>
            <div class="text-sm muted">≈ {{ fmtTime(avgLapSec) }} per 400m lap</div>
          </div>

          <!-- Lap splits mode -->
          <div v-else class="col gap-3">
            <div class="label">Enter each 400m lap</div>
            <div class="col gap-2">
              <div v-for="(lap, i) in laps" :key="i"
                class="row gap-2" style="align-items:center;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border)"
                :style="lapIsFastest(i) ? 'border-color:#2E6B4F;background:#EEF5F0' : lapIsSlowest(i) ? 'border-color:#C0392B20;background:#FEF2F2' : ''"
              >
                <div class="text-sm" style="width:52px;font-weight:600;color:var(--ink-muted)">Lap {{ i+1 }}</div>
                <div class="row gap-1" style="align-items:center;flex:1">
                  <input class="input mono" type="number" min="1" max="5" :value="lap[0]"
                    @input="updateLap(i, 0, +($event.target as HTMLInputElement).value)"
                    style="width:52px;text-align:center;padding:6px" />
                  <div style="font-weight:700;color:var(--ink-muted)">:</div>
                  <input class="input mono" type="number" min="0" max="59" :value="lap[1]"
                    @input="updateLap(i, 1, +($event.target as HTMLInputElement).value)"
                    style="width:52px;text-align:center;padding:6px" />
                </div>
                <div class="text-xs" style="width:48px;text-align:right;font-weight:600"
                  :style="lapIsFastest(i) ? 'color:#2E6B4F' : lapIsSlowest(i) ? 'color:#C0392B' : 'color:var(--ink-muted)'">
                  {{ lapIsFastest(i) ? '⚡ Best' : lapIsSlowest(i) ? '▲ Slow' : '' }}
                </div>
              </div>
            </div>

            <!-- Deviation chart -->
            <div class="col gap-1" style="margin-top:4px">
              <div class="text-xs muted">Lap deviation from avg ({{ fmtTime(avgLapSec) }})</div>
              <div class="row gap-1" style="height:52px;align-items:center">
                <div v-for="(sec, i) in lapSecs" :key="i" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px">
                  <div v-if="!lapIsOver(sec)"
                    :style="`height:${lapDevBarH(sec)}px;width:10px;border-radius:3px 3px 0 0;background:#2E6B4F;margin-bottom:auto`" />
                  <div style="width:2px;height:2px;background:var(--ink-muted);border-radius:1px;flex-shrink:0" />
                  <div v-if="lapIsOver(sec)"
                    :style="`height:${lapDevBarH(sec)}px;width:10px;border-radius:0 0 3px 3px;background:#C0392B80;margin-top:auto`" />
                </div>
              </div>
              <div class="row between">
                <div class="text-xs muted">Total: <span class="mono">{{ fmtTime(totalSec) }}</span></div>
                <div class="text-xs muted">Avg: <span class="mono">{{ fmtTime(avgLapSec) }}</span>/lap</div>
              </div>
            </div>
          </div>

          <!-- Effort -->
          <div class="col gap-2">
            <div class="label">Effort level</div>
            <div class="seg">
              <button :class="{ active: intensity === 'easy' }" @click="intensity='easy'">Easy</button>
              <button :class="{ active: intensity === 'tempo' }" @click="intensity='tempo'">Tempo</button>
              <button :class="{ active: intensity === 'race' }" @click="intensity='race'">Race pace</button>
            </div>
          </div>
        </div>

        <!-- Note -->
        <div class="col gap-2">
          <label class="label">Note (optional)</label>
          <input class="input" type="text" v-model="note" placeholder="e.g. Feeling strong today" />
        </div>
      </div>

      <!-- Right: score preview -->
      <div class="col gap-3" :style="mobile ? '' : 'width:280px;position:sticky;top:24px'">
        <div class="card dark col gap-4" style="padding:24px">
          <div class="text-xs" style="letter-spacing:.1em;opacity:.7;text-transform:uppercase">Score preview</div>
          <div class="row gap-3" style="align-items:flex-end">
            <div class="mono" style="font-size:52px;font-weight:700;line-height:1">{{ pts }}</div>
            <div style="opacity:.5;font-size:14px;padding-bottom:10px">/ {{ ptsMax }}</div>
          </div>
          <div style="height:6px;background:rgba(255,255,255,0.12);border-radius:3px;overflow:hidden">
            <div :style="`width:${(pts/ptsMax)*100}%`" style="height:100%;background:var(--primary-2);border-radius:3px;transition:width .3s" />
          </div>
          <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px" class="col gap-2">
            <div class="text-xs" style="opacity:.6">Projected total if used on test day</div>
            <div class="row gap-2" style="align-items:center">
              <div class="mono" style="font-size:28px;font-weight:700">{{ projTotal }}</div>
              <div style="opacity:.4">/&nbsp;100</div>
              <div class="grow" />
              <div class="tier-pill" :class="tierOf(projTotal).key">{{ tierOf(projTotal).name }}</div>
            </div>
          </div>
          <button class="btn primary" style="margin-top:8px;width:100%;justify-content:center" @click="save">
            Save session
          </button>
        </div>
        <div class="text-xs muted" style="text-align:center">
          {{ station === 'run' ? valueLabel : `${reps} reps · ` }}{{ pts }} pts scored
        </div>
      </div>
    </div>
  </div>
</template>
