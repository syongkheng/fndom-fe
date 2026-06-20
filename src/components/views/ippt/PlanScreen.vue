<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIpptStore } from '@/stores/ippt'
import IpptIcon from './IpptIcon.vue'

defineProps<{ mobile: boolean }>()
const emit = defineEmits<{ go: [tab: string]; toast: [msg: string] }>()

const store = useIpptStore()

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const todayDow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]

const expanded = ref<string | null>(todayDow)

function toggle(day: string) {
  expanded.value = expanded.value === day ? null : day
}

function markDone(day: string) {
  store.markPlanDone(day, true)
  emit('toast', `${day} marked complete`)
}

// 6-week ramp: mock volume data (relative units)
const RAMP = [40, 52, 58, 70, 62, 80]
const rampMax = Math.max(...RAMP)

function barH(v: number) { return Math.round((v / rampMax) * 56) }

const doneCount = computed(() => store.plan.filter(d => d.done).length)
const totalCount = computed(() => store.plan.length)
</script>

<template>
  <div class="col gap-5" style="padding:24px 24px 48px">
    <!-- Header -->
    <div class="row between" style="align-items:flex-start">
      <div>
        <div class="h2">Training plan</div>
        <div class="text-sm muted" style="margin-top:4px">6-week program to your goal</div>
      </div>
      <div class="tag" style="background:var(--primary-tint);color:var(--primary-2)">
        {{ doneCount }}/{{ totalCount }} this week
      </div>
    </div>

    <!-- 6-week ramp chart -->
    <div class="card col gap-3" style="padding:20px">
      <div class="row between" style="align-items:flex-start">
        <div>
          <div style="font-size:14px;font-weight:600">Volume ramp</div>
          <div class="text-xs muted">6-week training load</div>
        </div>
        <div class="tag">Week 1 of 6</div>
      </div>
      <div class="row gap-2" style="height:72px;align-items:flex-end;padding-top:8px">
        <div v-for="(v, i) in RAMP" :key="i" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <div
            :style="`height:${barH(v)}px;width:100%;border-radius:4px 4px 0 0;background:${i === 0 ? 'var(--primary-2)' : i === 5 ? 'var(--gold)' : 'color-mix(in srgb,var(--primary-2) 40%,transparent)'}`"
          />
          <div class="text-xs muted">W{{ i+1 }}</div>
        </div>
      </div>
    </div>

    <!-- Day cards -->
    <div class="col gap-2">
      <div v-for="day in DAYS" :key="day">
        <div v-if="store.plan.find(d => d.day === day) as any" >
          <template v-for="planDay in [store.plan.find(d => d.day === day)!]" :key="planDay.day">
            <!-- Header row -->
            <div
              class="card" style="padding:0;overflow:hidden;cursor:pointer"
              :style="planDay.day === todayDow ? 'border-color:var(--primary-2);box-shadow:0 0 0 2px var(--primary-2)20' : ''"
              @click="toggle(day)"
            >
              <div class="row between" style="padding:16px 20px;align-items:center">
                <div class="row gap-3" style="align-items:center">
                  <!-- Done indicator -->
                  <div style="width:28px;height:28px;border-radius:50%;display:grid;place-items:center;flex-shrink:0"
                    :style="planDay.done ? 'background:var(--primary-2);color:#fff' : planDay.day === todayDow ? 'background:var(--primary-tint);color:var(--primary-2)' : 'background:var(--surface-2);color:var(--ink-muted)'">
                    <IpptIcon v-if="planDay.done" name="check" :size="14" />
                    <IpptIcon v-else-if="planDay.day === todayDow" name="play" :size="12" />
                    <div v-else style="font-size:11px;font-weight:700">{{ DAYS.indexOf(day)+1 }}</div>
                  </div>
                  <div class="col" style="gap:1px">
                    <div class="row gap-2" style="align-items:center">
                      <div style="font-size:14px;font-weight:600">{{ planDay.day }}</div>
                      <div v-if="planDay.day === todayDow" class="tag" style="background:var(--primary-tint);color:var(--primary-2);font-size:10px;padding:2px 7px">Today</div>
                    </div>
                    <div class="text-xs muted">{{ planDay.focus }}</div>
                  </div>
                </div>
                <div class="row gap-2" style="align-items:center">
                  <div class="text-xs muted">{{ planDay.exercises.length }} exercises</div>
                  <IpptIcon :name="expanded === day ? 'chevDown' : 'chev'" :size="16" style="color:var(--ink-muted)" />
                </div>
              </div>

              <!-- Expanded -->
              <div v-if="expanded === day" style="border-top:1px solid var(--border);padding:16px 20px 20px" class="col gap-3">
                <div class="col gap-2">
                  <div v-for="(ex, idx) in planDay.exercises" :key="idx" class="row gap-3" style="align-items:flex-start">
                    <div style="width:20px;height:20px;border-radius:50%;background:var(--primary-tint);color:var(--primary-2);display:grid;place-items:center;flex-shrink:0;font-size:10px;font-weight:700">{{ idx+1 }}</div>
                    <div class="col" style="gap:1px;flex:1">
                      <div style="font-size:13px;font-weight:600">{{ ex.name }}</div>
                      <div v-if="ex.sets || ex.reps" class="text-xs muted">
                        <span v-if="ex.sets">{{ ex.sets }} sets</span>
                        <span v-if="ex.sets && ex.reps"> · </span>
                        <span v-if="ex.reps">{{ ex.reps }}</span>
                        <span v-if="ex.note"> · {{ ex.note }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="row gap-2" style="margin-top:4px">
                  <button v-if="!planDay.done" class="btn primary" style="flex:1;justify-content:center" @click.stop="markDone(day)">
                    <IpptIcon name="check" :size="14" /> Mark done
                  </button>
                  <div v-else class="text-sm" style="color:var(--primary-2);font-weight:600;display:flex;align-items:center;gap:6px">
                    <IpptIcon name="check" :size="14" /> Completed
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Dark coaching card -->
    <div class="card dark col gap-3" style="padding:20px">
      <div style="font-size:13px;font-weight:600;opacity:.8;letter-spacing:.05em;text-transform:uppercase">Coach tip</div>
      <div class="text-sm" style="line-height:1.6;opacity:.9">
        Consistency beats intensity. Three moderate sessions per week will outperform one heroic effort that leaves you sore for four days. Stick to the plan — the score will follow.
      </div>
      <button class="btn" style="align-self:flex-start;background:rgba(255,255,255,.12);color:#fff;border:none;padding:8px 14px" @click="emit('go','schedule')">
        See full schedule <IpptIcon name="arr" :size="14" />
      </button>
    </div>
  </div>
</template>
