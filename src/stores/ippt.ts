import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ageBand, scoreReps, scoreRun } from '@/utilities/ipptScoring'

export interface IpptProfile {
  name: string
  age: number
  height: number
  weight: number
  joined: string
  goalTier: 'gold' | 'silver' | 'pass'
  testDate: string
  daysToTest: number
}

export interface IpptSession {
  id: string
  type: 'push' | 'sit' | 'run'
  value: number
  pts: number | null
  date: string
  note?: string
  effort?: 'easy' | 'tempo' | 'race'
  laps?: number[]
}

export interface IpptBadge {
  id: string
  label: string
  desc: string
  icon: string
  earned: boolean
  earnedDate?: string
}

export interface IpptPlanDay {
  day: string
  focus: string
  exercises: { name: string; sets?: number; reps?: string; note?: string }[]
  done?: boolean
}

export interface IpptEvent {
  id: string
  date: string
  type: 'training' | 'nsfit' | 'ippt'
  title: string
  location?: string
  time?: string
  slotsLeft?: number
}

const SEED_PROFILE: IpptProfile = {
  name: 'Soldier',
  age: 28,
  height: 174,
  weight: 70,
  joined: 'May 2026',
  goalTier: 'gold',
  testDate: 'Jul 18',
  daysToTest: 53,
}

const SEED_ACTIVITY: IpptSession[] = [
  { id: 'a1', type: 'push', value: 42, pts: 17, date: '2026-05-20' },
  { id: 'a2', type: 'sit',  value: 39, pts: 15, date: '2026-05-20' },
  { id: 'a3', type: 'run',  value: 780, pts: 29, date: '2026-05-18', effort: 'tempo' },
  { id: 'a4', type: 'push', value: 45, pts: 19, date: '2026-05-15' },
  { id: 'a5', type: 'sit',  value: 42, pts: 17, date: '2026-05-15' },
  { id: 'a6', type: 'run',  value: 800, pts: 25, date: '2026-05-12', effort: 'race' },
  { id: 'a7', type: 'push', value: 38, pts: 15, date: '2026-05-10' },
  { id: 'a8', type: 'run',  value: 820, pts: 25, date: '2026-05-08', effort: 'easy' },
]

const SEED_BADGES: IpptBadge[] = [
  { id: 'b1', label: 'First Rep',    desc: 'Log your first session',       icon: '🎯', earned: true,  earnedDate: '2026-05-10' },
  { id: 'b2', label: 'Iron Fist',    desc: '50+ push-ups in one session',  icon: '💪', earned: false },
  { id: 'b3', label: 'Core Crusher', desc: '50+ sit-ups in one session',   icon: '🔥', earned: false },
  { id: 'b4', label: 'Silver Star',  desc: 'Score Silver or above',        icon: '⭐', earned: false },
  { id: 'b5', label: 'Gold Rush',    desc: 'Score Gold',                   icon: '🏅', earned: false },
  { id: 'b6', label: 'Sub-13',       desc: 'Run 2.4km under 13 minutes',   icon: '⚡', earned: false },
  { id: 'b7', label: 'Week Warrior', desc: 'Train 5 days in a week',       icon: '📅', earned: true, earnedDate: '2026-05-22' },
  { id: 'b8', label: 'Consistent',   desc: 'Log 10 sessions total',        icon: '✅', earned: false },
]

const SEED_PLAN: IpptPlanDay[] = [
  { day: 'Mon', focus: 'Push-up strength',   exercises: [{ name: 'Max push-ups', sets: 4, reps: 'max' }, { name: 'Diamond push-ups', sets: 3, reps: '10' }, { name: 'Plank holds', sets: 3, reps: '45s' }] },
  { day: 'Tue', focus: '2.4km tempo run',    exercises: [{ name: 'Warm-up jog', reps: '5 min' }, { name: 'Tempo 2.4km', reps: 'target pace' }, { name: 'Cool-down walk', reps: '5 min' }] },
  { day: 'Wed', focus: 'Sit-up endurance',   exercises: [{ name: 'Max sit-ups', sets: 4, reps: 'max' }, { name: 'Bicycle crunches', sets: 3, reps: '20' }, { name: 'Leg raises', sets: 3, reps: '15' }] },
  { day: 'Thu', focus: 'Active recovery',    exercises: [{ name: 'Easy walk / swim', reps: '30 min' }, { name: 'Stretch routine', reps: '15 min' }] },
  { day: 'Fri', focus: 'Full IPPT simulation', exercises: [{ name: 'Max push-ups', sets: 1, reps: 'score' }, { name: 'Max sit-ups', sets: 1, reps: 'score' }, { name: 'Timed 2.4km', reps: 'race pace' }] },
  { day: 'Sat', focus: 'Interval run',       exercises: [{ name: '6× 400m intervals', reps: 'fast' }, { name: 'Rest between sets', reps: '90s' }] },
  { day: 'Sun', focus: 'Rest day',           exercises: [{ name: 'Light stretching', reps: '20 min' }] },
]

const SEED_EVENTS: IpptEvent[] = [
  { id: 'e1', date: '2026-05-28', type: 'training', title: 'Track session', location: 'Bishan Stadium', time: '07:00' },
  { id: 'e2', date: '2026-06-04', type: 'nsfit',    title: 'NS Fit booking', location: 'Maju Camp Fitness Centre', time: '06:30', slotsLeft: 4 },
  { id: 'e3', date: '2026-06-14', type: 'training', title: 'Full simulation', location: 'Home gym', time: '08:00' },
  { id: 'e4', date: '2026-07-18', type: 'ippt',     title: 'IPPT Test', location: 'SAFSA @ Khatib', time: '07:30' },
]

const STORAGE_KEY = 'ippt_store_v1'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveToStorage(data: object) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

export const useIpptStore = defineStore('ippt', () => {
  const saved = loadFromStorage()

  const profile = ref<IpptProfile>(saved?.profile ?? SEED_PROFILE)
  const activity = ref<IpptSession[]>(saved?.activity ?? SEED_ACTIVITY)
  const badges = ref<IpptBadge[]>(saved?.badges ?? SEED_BADGES)
  const plan = ref<IpptPlanDay[]>(saved?.plan ?? SEED_PLAN)
  const events = ref<IpptEvent[]>(saved?.events ?? SEED_EVENTS)
  const onboarded = ref<boolean>(saved?.onboarded ?? false)

  function persist() {
    saveToStorage({ profile: profile.value, activity: activity.value, badges: badges.value, plan: plan.value, events: events.value, onboarded: onboarded.value })
  }

  const breakdown = computed(() => {
    const band = ageBand(profile.value.age)
    const bestPush = activity.value.filter(a => a.type === 'push').sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0))[0]
    const bestSit  = activity.value.filter(a => a.type === 'sit').sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0))[0]
    const bestRun  = activity.value.filter(a => a.type === 'run').sort((a, b) => a.value - b.value)[0]
    return {
      push: bestPush?.pts ?? 0,
      sit:  bestSit?.pts ?? 0,
      run:  bestRun?.pts ?? 0,
      pushValue: bestPush?.value ?? 0,
      sitValue:  bestSit?.value ?? 0,
      runValue:  bestRun?.value ?? 0,
      band,
    }
  })

  const projectedScore = computed(() => breakdown.value.push + breakdown.value.sit + breakdown.value.run)

  function logSession(s: IpptSession) {
    activity.value.unshift(s)
    persist()
  }

  function setProfile(p: IpptProfile) {
    profile.value = p
    persist()
  }

  function setOnboarded(v: boolean) {
    onboarded.value = v
    persist()
  }

  function markPlanDone(day: string, done: boolean) {
    const d = plan.value.find(p => p.day === day)
    if (d) { d.done = done; persist() }
  }

  return { profile, activity, badges, plan, events, onboarded, breakdown, projectedScore, logSession, setProfile, setOnboarded, markPlanDone }
})
