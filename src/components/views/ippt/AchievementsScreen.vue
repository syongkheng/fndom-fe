<script setup lang="ts">
import { computed } from 'vue'
import { useIpptStore } from '@/stores/ippt'
import { tierOf } from '@/utilities/ipptScoring'
import IpptIcon from './IpptIcon.vue'

defineProps<{ mobile: boolean }>()

const store = useIpptStore()

const earnedBadges  = computed(() => store.badges.filter(b => b.earned))
const lockedBadges  = computed(() => store.badges.filter(b => !b.earned))
const earnedCount   = computed(() => earnedBadges.value.length)
const total         = computed(() => store.badges.length)
const progressPct   = computed(() => Math.round((earnedCount.value / total.value) * 100))

const projected     = computed(() => store.projectedScore)
const tier          = computed(() => tierOf(projected.value))

// Ring math
const RS = 120
const RR = RS / 2 - 10
const RC = computed(() => 2 * Math.PI * RR)
const RO = computed(() => RC.value - (earnedCount.value / total.value) * RC.value)

const MILESTONES = [
  { label: 'Pass',             threshold: 51, key: 'pass',   desc: 'Score ≥ 51 on your next attempt' },
  { label: 'Silver',           threshold: 61, key: 'silver', desc: 'Score ≥ 61' },
  { label: 'Gold',             threshold: 75, key: 'gold',   desc: 'Score ≥ 75' },
  { label: 'Gold + Incentive', threshold: 85, key: 'gold',   desc: 'Score ≥ 85 — maximum payout' },
]

const nextMilestones = computed(() =>
  MILESTONES.filter(m => projected.value < m.threshold).slice(0, 3)
)
</script>

<template>
  <div class="col gap-5" style="padding:24px 24px 48px">
    <!-- Header -->
    <div>
      <div class="h2">Achievements</div>
      <div class="text-sm muted" style="margin-top:4px">{{ earnedCount }} of {{ total }} badges earned</div>
    </div>

    <!-- Progress ring card -->
    <div class="card" style="padding:20px">
      <div :class="mobile ? 'col gap-4' : 'row gap-5'" style="align-items:center">
        <!-- Ring -->
        <div style="position:relative;flex-shrink:0">
          <svg :width="RS" :height="RS" :viewBox="`0 0 ${RS} ${RS}`">
            <circle :cx="RS/2" :cy="RS/2" :r="RR"
              fill="none" stroke="var(--border)" :stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="RC" :stroke-dashoffset="0"
              style="transform:rotate(-90deg);transform-origin:50% 50%"
            />
            <circle :cx="RS/2" :cy="RS/2" :r="RR"
              fill="none" stroke="var(--primary-2)" :stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="RC" :stroke-dashoffset="RO"
              style="transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dashoffset .6s"
            />
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div class="mono" style="font-size:26px;font-weight:700;line-height:1">{{ earnedCount }}</div>
            <div style="font-size:10px;color:var(--ink-muted)">/ {{ total }}</div>
          </div>
        </div>

        <!-- Stats -->
        <div class="col gap-3" style="flex:1">
          <div>
            <div style="font-size:16px;font-weight:700">{{ progressPct }}% complete</div>
            <div class="text-sm muted">{{ total - earnedCount }} badge{{ total - earnedCount !== 1 ? 's' : '' }} to go</div>
          </div>
          <div class="bar">
            <div class="fill" :style="`width:${progressPct}%`" />
          </div>
          <div class="tier-pill" :class="tier.key">Current tier: {{ tier.name }}</div>
        </div>
      </div>
    </div>

    <!-- Badge grid -->
    <div>
      <div class="label" style="margin-bottom:12px">All badges</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        <div v-for="badge in store.badges" :key="badge.id"
          class="badge-tile"
          :class="{ locked: !badge.earned }"
        >
          <div class="badge-icon">{{ badge.icon }}</div>
          <div class="badge-name">{{ badge.label }}</div>
          <div class="badge-sub">{{ badge.desc }}</div>
          <div v-if="badge.earned && badge.earnedDate" class="text-xs" style="color:var(--primary-2);margin-top:4px;font-size:10px">
            {{ badge.earnedDate }}
          </div>
          <IpptIcon v-if="!badge.earned" name="lock" :size="12" style="color:var(--ink-muted);margin-top:4px;opacity:.5" />
        </div>
      </div>
    </div>

    <!-- Milestones ahead -->
    <div v-if="nextMilestones.length" class="col gap-3">
      <div class="label">Milestones ahead</div>
      <div class="col gap-2">
        <div v-for="m in nextMilestones" :key="m.label" class="card flat" style="padding:14px">
          <div class="row gap-3" style="align-items:center">
            <div style="width:36px;height:36px;border-radius:10px;background:var(--primary-tint);display:grid;place-items:center;flex-shrink:0">
              <IpptIcon name="star" :size="16" style="color:var(--primary-2)" />
            </div>
            <div class="col" style="gap:2px;flex:1">
              <div style="font-size:14px;font-weight:600">{{ m.label }}</div>
              <div class="text-xs muted">{{ m.desc }}</div>
            </div>
            <div class="tag" :class="m.key">{{ m.threshold - projected }} pts away</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card flat" style="padding:14px">
      <div class="row gap-2" style="align-items:center">
        <IpptIcon name="trophy" :size="16" style="color:var(--gold)" />
        <div class="text-sm" style="font-weight:600;color:var(--gold)">All score milestones achieved!</div>
      </div>
    </div>
  </div>
</template>
