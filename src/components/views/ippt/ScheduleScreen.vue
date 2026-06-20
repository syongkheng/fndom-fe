<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIpptStore } from '@/stores/ippt'
import IpptIcon from './IpptIcon.vue'

const props = defineProps<{ mobile: boolean }>()
const emit = defineEmits<{ go: [tab: string]; toast: [msg: string] }>()

const store = useIpptStore()

const viewMode = ref<'calendar' | 'nsfit'>('calendar')

const today = new Date()
const year = ref(today.getFullYear())
const month = ref(today.getMonth()) // 0-indexed
const selectedDay = ref<number | null>(today.getDate())

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const monthName = computed(() => `${MONTHS[month.value]} ${year.value}`)

function prevMonth() {
  if (month.value === 0) { month.value = 11; year.value-- } else month.value--
}
function nextMonth() {
  if (month.value === 11) { month.value = 0; year.value++ } else month.value++
}

const calDays = computed(() => {
  const firstDow = new Date(year.value, month.value, 1).getDay()
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const cells: Array<{ day: number | null }> = []
  for (let i = 0; i < firstDow; i++) cells.push({ day: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d })
  while (cells.length % 7 !== 0) cells.push({ day: null })
  return cells
})

function evYear(ev: { date: string }) { return parseInt(ev.date.slice(0, 4)) }
function evMonth(ev: { date: string }) { return parseInt(ev.date.slice(5, 7)) - 1 }
function evDay(ev: { date: string }) { return parseInt(ev.date.slice(8, 10)) }

function eventDot(day: number | null): string | null {
  if (!day) return null
  const ev = store.events.find(e => evDay(e) === day && evMonth(e) === month.value && evYear(e) === year.value)
  if (!ev) return null
  if (ev.type === 'ippt') return 'var(--accent)'
  if (ev.type === 'nsfit') return 'var(--primary-2)'
  return 'var(--ink-muted)'
}

const selectedEvents = computed(() => {
  if (!selectedDay.value) return []
  return store.events.filter(e => evDay(e) === selectedDay.value && evMonth(e) === month.value && evYear(e) === year.value)
})

const isToday = (day: number | null) =>
  day === today.getDate() && month.value === today.getMonth() && year.value === today.getFullYear()

const NS_FIT = [
  { name: 'Maju ActiveSG',       area: 'Bukit Timah',   km: 2.3, slots: 6 },
  { name: 'Heartbeat@Bedok',     area: 'Bedok Central', km: 5.1, slots: 3 },
  { name: 'Our Tampines Hub',    area: 'Tampines',       km: 7.8, slots: 12 },
  { name: 'Toa Payoh SportsHub', area: 'Toa Payoh',     km: 4.4, slots: 1 },
  { name: 'Jurong East Stadium', area: 'Jurong East',   km: 9.2, slots: 9 },
]

function slotsColor(slots: number) {
  if (slots === 0) return 'var(--ink-muted)'
  if (slots <= 2) return 'var(--accent)'
  return 'var(--primary-2)'
}

function bookNsFit(name: string) {
  emit('toast', `Booking requested for ${name}`)
}
</script>

<template>
  <div class="col gap-5" style="padding:24px 24px 48px">
    <!-- Header -->
    <div class="row between" style="align-items:flex-start">
      <div>
        <div class="h2">Schedule</div>
        <div class="text-sm muted" style="margin-top:4px">Training calendar &amp; NS Fit centres</div>
      </div>
    </div>

    <!-- Seg switcher -->
    <div class="seg" style="align-self:flex-start">
      <button :class="{ active: viewMode === 'calendar' }" @click="viewMode='calendar'">
        <IpptIcon name="cal" :size="14" style="margin-right:5px" /> Calendar
      </button>
      <button :class="{ active: viewMode === 'nsfit' }" @click="viewMode='nsfit'">
        <IpptIcon name="pin" :size="14" style="margin-right:5px" /> NS Fit
      </button>
    </div>

    <!-- Calendar view -->
    <div v-if="viewMode === 'calendar'" class="col gap-4">
      <div class="card col gap-3" style="padding:20px">
        <!-- Month nav -->
        <div class="row between" style="align-items:center">
          <button class="btn ghost" style="padding:6px 10px" @click="prevMonth">
            <IpptIcon name="chevL" :size="16" />
          </button>
          <div style="font-weight:700;font-size:15px">{{ monthName }}</div>
          <button class="btn ghost" style="padding:6px 10px" @click="nextMonth">
            <IpptIcon name="chev" :size="16" />
          </button>
        </div>

        <!-- DOW headers -->
        <div class="cal">
          <div v-for="d in DAYS" :key="d" class="cal-hd">{{ d }}</div>
        </div>

        <!-- Day grid -->
        <div class="cal">
          <div
            v-for="(cell, idx) in calDays" :key="idx"
            class="cal-day"
            :class="{
              today: isToday(cell.day),
              selected: cell.day === selectedDay && !isToday(cell.day),
              empty: !cell.day
            }"
            @click="cell.day && (selectedDay = cell.day)"
          >
            <span v-if="cell.day">{{ cell.day }}</span>
            <div v-if="eventDot(cell.day)" class="cal-dot" :style="`background:${eventDot(cell.day)}`" />
          </div>
        </div>
      </div>

      <!-- Day detail panel -->
      <div v-if="selectedDay" class="card col gap-3" style="padding:20px">
        <div style="font-weight:700;font-size:15px">{{ MONTHS[month] }} {{ selectedDay }}</div>
        <div v-if="selectedEvents.length === 0" class="text-sm muted">No events scheduled</div>
        <div v-else class="col gap-3">
          <div v-for="ev in selectedEvents" :key="ev.id" class="row gap-3" style="align-items:flex-start">
            <div style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;flex-shrink:0"
              :style="ev.type === 'ippt' ? 'background:var(--accent-tint);color:var(--accent)' : ev.type === 'nsfit' ? 'background:var(--primary-tint);color:var(--primary-2)' : 'background:var(--surface-2);color:var(--ink-muted)'">
              <IpptIcon :name="ev.type === 'ippt' ? 'target' : ev.type === 'nsfit' ? 'pin' : 'cal'" :size="16" />
            </div>
            <div class="col" style="gap:2px;flex:1">
              <div style="font-size:14px;font-weight:600">{{ ev.title }}</div>
              <div class="text-xs muted">{{ ev.location }}{{ ev.time ? ` · ${ev.time}` : '' }}</div>
            </div>
            <div class="tag" :style="ev.type === 'ippt' ? 'background:var(--accent-tint);color:var(--accent)' : 'background:var(--primary-tint);color:var(--primary-2)'">
              {{ ev.type === 'ippt' ? 'Test day' : ev.type === 'nsfit' ? 'NS Fit' : 'Training' }}
            </div>
          </div>
        </div>
        <button v-if="selectedEvents.length === 0" class="btn ghost" style="align-self:flex-start">
          <IpptIcon name="plus" :size="14" /> Add event
        </button>
      </div>

      <!-- Legend -->
      <div class="row gap-4" style="flex-wrap:wrap">
        <div v-for="leg in [{ color:'var(--accent)', label:'IPPT' }, { color:'var(--primary-2)', label:'NS Fit' }, { color:'var(--ink-muted)', label:'Training' }]" :key="leg.label"
          class="row gap-2" style="align-items:center">
          <div style="width:8px;height:8px;border-radius:50%" :style="`background:${leg.color}`" />
          <div class="text-xs muted">{{ leg.label }}</div>
        </div>
      </div>
    </div>

    <!-- NS Fit view -->
    <div v-else class="col gap-4">
      <div class="card flat col gap-1" style="padding:14px">
        <div class="row gap-2">
          <IpptIcon name="info" :size="16" style="color:var(--ink-muted);flex-shrink:0" />
          <div class="text-sm muted">Showing NS Fit centres near your area. Book a slot to sync it to your calendar.</div>
        </div>
      </div>

      <div class="col gap-3">
        <div v-for="c in NS_FIT" :key="c.name" class="card" style="padding:16px">
          <div class="row between" style="align-items:flex-start">
            <div class="row gap-3">
              <div style="width:40px;height:40px;border-radius:12px;background:var(--primary-tint);display:grid;place-items:center;flex-shrink:0">
                <IpptIcon name="pin" :size="18" style="color:var(--primary-2)" />
              </div>
              <div class="col" style="gap:3px">
                <div style="font-size:14px;font-weight:600">{{ c.name }}</div>
                <div class="text-xs muted">{{ c.area }}</div>
                <div class="row gap-3" style="margin-top:4px">
                  <div class="tag">{{ c.km }} km away</div>
                  <div class="tag" :style="`color:${slotsColor(c.slots)};background:${slotsColor(c.slots)}18`">
                    {{ c.slots === 0 ? 'Full' : `${c.slots} slots` }}
                  </div>
                </div>
              </div>
            </div>
            <button
              class="btn primary" style="padding:8px 14px;font-size:13px;flex-shrink:0;margin-left:12px"
              :disabled="c.slots === 0"
              @click="bookNsFit(c.name)">
              Book
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
