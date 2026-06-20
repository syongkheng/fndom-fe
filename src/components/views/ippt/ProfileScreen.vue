<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIpptStore } from '@/stores/ippt'
import { fmtTime, tierOf } from '@/utilities/ipptScoring'
import IpptIcon from './IpptIcon.vue'

defineProps<{ mobile: boolean }>()
const emit = defineEmits<{ go: [tab: string]; toast: [msg: string] }>()

const store = useIpptStore()

const editing = ref(false)
const editAge    = ref(store.profile?.age ?? 28)
const editHeight = ref(store.profile?.height ?? 174)
const editWeight = ref(store.profile?.weight ?? 70)
const editGoal   = ref<'gold'|'silver'|'pass'>(store.profile?.goalTier ?? 'gold')

function saveProfile() {
  if (!store.profile) return
  store.setProfile({ ...store.profile, age: editAge.value, height: editHeight.value, weight: editWeight.value, goalTier: editGoal.value })
  editing.value = false
  emit('toast', 'Profile updated')
}

const bd = computed(() => store.breakdown)
const proj = computed(() => store.projectedScore)
const tier = computed(() => tierOf(proj.value))

const MILESTONES = [
  { label: 'Pass',             threshold: 51, key: 'pass' },
  { label: 'Silver',           threshold: 61, key: 'silver' },
  { label: 'Gold',             threshold: 75, key: 'gold' },
  { label: 'Gold + Incentive', threshold: 85, key: 'gold' },
]

function mDone(t: number) { return proj.value >= t }
function mPct(t: number) { return Math.min(100, Math.round((proj.value / t) * 100)) }

const sessionCount = computed(() => store.activity.length)
const earnedBadges = computed(() => store.badges.filter(b => b.earned).length)
</script>

<template>
  <div class="col gap-5" style="padding:24px 24px 48px">
    <!-- Header -->
    <div class="row between" style="align-items:center">
      <div class="h2">Profile</div>
      <button class="btn ghost" style="padding:6px 12px;font-size:13px" @click="editing = !editing">
        <IpptIcon :name="editing ? 'check' : 'edit'" :size="14" />
        {{ editing ? 'Done' : 'Edit' }}
      </button>
    </div>

    <!-- Avatar + name -->
    <div class="row gap-4" style="align-items:center">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--primary-2);color:#fff;display:grid;place-items:center;font-size:24px;font-weight:700;flex-shrink:0">
        {{ store.profile?.name?.[0] ?? 'S' }}
      </div>
      <div class="col" style="gap:4px">
        <div style="font-size:20px;font-weight:700;letter-spacing:-.01em">{{ store.profile?.name ?? 'Soldier' }}</div>
        <div class="text-sm muted">Joined {{ store.profile?.joined ?? '—' }}</div>
        <div class="tier-pill" :class="tier.key" style="align-self:flex-start;margin-top:2px">{{ tier.name }}</div>
      </div>
    </div>

    <!-- Stats row -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
      <div v-for="stat in [
        { label: 'Sessions', value: sessionCount },
        { label: 'Badges', value: earnedBadges },
        { label: 'Days to test', value: store.profile?.daysToTest ?? '—' },
      ]" :key="stat.label" class="card flat" style="padding:14px;align-items:center;gap:4px">
        <div class="mono" style="font-size:24px;font-weight:700">{{ stat.value }}</div>
        <div class="text-xs muted" style="text-align:center">{{ stat.label }}</div>
      </div>
    </div>

    <!-- Personal bests -->
    <div class="col gap-3">
      <div class="label">Personal bests</div>
      <div class="card col gap-3" style="padding:20px">
        <div v-for="row in [
          { label: 'Push-ups', value: bd.pushValue ? `${bd.pushValue} reps` : '—', pts: bd.push, max: 25 },
          { label: 'Sit-ups',  value: bd.sitValue  ? `${bd.sitValue} reps`  : '—', pts: bd.sit,  max: 25 },
          { label: '2.4km',    value: bd.runValue   ? fmtTime(bd.runValue)   : '—', pts: bd.run,  max: 50 },
        ]" :key="row.label" class="row gap-3" style="align-items:center">
          <div style="width:80px;font-size:13px;font-weight:600">{{ row.label }}</div>
          <div class="mono text-sm" style="width:72px;color:var(--primary-2)">{{ row.value }}</div>
          <div class="bar" style="flex:1">
            <div class="fill" :style="`width:${(row.pts/row.max)*100}%`" />
          </div>
          <div class="text-xs muted" style="width:28px;text-align:right">{{ row.pts }}</div>
        </div>
      </div>
    </div>

    <!-- Goal progress -->
    <div class="col gap-3">
      <div class="label">Goal progress</div>
      <div class="col gap-2">
        <div v-for="m in MILESTONES" :key="m.label" class="row gap-3" style="align-items:center">
          <div style="width:32px;height:32px;border-radius:50%;display:grid;place-items:center;flex-shrink:0"
            :style="mDone(m.threshold) ? 'background:var(--primary-2);color:#fff' : 'background:var(--surface-2);color:var(--ink-muted)'">
            <IpptIcon :name="mDone(m.threshold) ? 'check' : 'lock'" :size="14" />
          </div>
          <div class="col" style="gap:4px;flex:1">
            <div class="row between">
              <div style="font-size:13px;font-weight:600">{{ m.label }}</div>
              <div class="text-xs muted">{{ m.threshold }} pts</div>
            </div>
            <div class="bar">
              <div class="fill" :style="`width:${mPct(m.threshold)}%;background:${mDone(m.threshold) ? 'var(--primary-2)' : 'var(--ink-muted)'}`" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit form -->
    <div v-if="editing" class="card col gap-4" style="padding:20px">
      <div style="font-size:14px;font-weight:700">Edit profile</div>
      <div class="col gap-2">
        <label class="label">Age</label>
        <input class="input" type="number" v-model.number="editAge" style="max-width:120px" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="col gap-2">
          <label class="label">Height (cm)</label>
          <input class="input" type="number" v-model.number="editHeight" />
        </div>
        <div class="col gap-2">
          <label class="label">Weight (kg)</label>
          <input class="input" type="number" v-model.number="editWeight" />
        </div>
      </div>
      <div class="col gap-2">
        <label class="label">Goal tier</label>
        <div class="seg">
          <button :class="{ active: editGoal === 'pass' }"   @click="editGoal='pass'">Pass</button>
          <button :class="{ active: editGoal === 'silver' }" @click="editGoal='silver'">Silver</button>
          <button :class="{ active: editGoal === 'gold' }"   @click="editGoal='gold'">Gold</button>
        </div>
      </div>
      <div class="row gap-2">
        <button class="btn ghost" @click="editing=false">Cancel</button>
        <button class="btn primary" @click="saveProfile">Save changes</button>
      </div>
    </div>

    <!-- Dark streak card -->
    <div class="card dark col gap-3" style="padding:20px">
      <div class="row between" style="align-items:center">
        <div>
          <div style="font-size:14px;font-weight:600;opacity:.9">Test day countdown</div>
          <div class="text-sm" style="opacity:.6;margin-top:2px">{{ store.profile?.testDate ?? '—' }}</div>
        </div>
        <div class="mono" style="font-size:36px;font-weight:700">{{ store.profile?.daysToTest ?? '—' }}</div>
      </div>
      <div style="font-size:12px;opacity:.5">days remaining</div>
      <button class="btn" style="align-self:flex-start;background:rgba(255,255,255,.12);color:#fff;border:none;padding:8px 14px" @click="emit('go','schedule')">
        View schedule <IpptIcon name="arr" :size="14" />
      </button>
    </div>
  </div>
</template>
