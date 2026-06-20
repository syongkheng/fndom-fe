<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useIpptStore } from '@/stores/ippt'
import { ageBand, tierOf, fmtTime } from '@/utilities/ipptScoring'
import IpptIcon from './IpptIcon.vue'
import OnboardingModal from './OnboardingModal.vue'
import DashboardScreen from './DashboardScreen.vue'
import LogScreen from './LogScreen.vue'
import CalculatorScreen from './CalculatorScreen.vue'
import ScheduleScreen from './ScheduleScreen.vue'
import PlanScreen from './PlanScreen.vue'
import AchievementsScreen from './AchievementsScreen.vue'
import ProfileScreen from './ProfileScreen.vue'

// ── Responsive ────────────────────────────────────────────────────────────────
const mobile = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
function onResize() { mobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// ── Store ─────────────────────────────────────────────────────────────────────
const store = useIpptStore()

// ── Tab ───────────────────────────────────────────────────────────────────────
type TabKey = 'dashboard' | 'log' | 'calculator' | 'schedule' | 'plan' | 'achievements' | 'profile'
const tab = ref<TabKey>('dashboard')

const TABS = [
  { key: 'dashboard',  label: 'Home',     icon: 'home' },
  { key: 'log',        label: 'Log',      icon: 'plus' },
  { key: 'calculator', label: 'Score',    icon: 'calculator' },
  { key: 'schedule',   label: 'Schedule', icon: 'cal' },
  { key: 'plan',       label: 'Plan',     icon: 'list' },
] as const

const SIDENAV_LINKS = [
  { key: 'dashboard',  label: 'Dashboard',  icon: 'home' },
  { key: 'log',        label: 'Log session', icon: 'plus' },
  { key: 'calculator', label: 'Score calc',  icon: 'calculator' },
  { key: 'schedule',   label: 'Schedule',    icon: 'cal' },
  { key: 'plan',       label: 'Plan',        icon: 'list' },
  { key: 'achievements', label: 'Achievements', icon: 'trophy' },
] as const

// ── Toast ─────────────────────────────────────────────────────────────────────
const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function toast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2800)
}

// ── Onboarding ────────────────────────────────────────────────────────────────
const showOnboarding = ref(!store.onboarded)
function completeOnboarding() { showOnboarding.value = false }

// ── Derived ───────────────────────────────────────────────────────────────────
const projected = computed(() => store.projectedScore)
const tier = computed(() => tierOf(projected.value))
const profile = computed(() => store.profile)
const bd = computed(() => store.breakdown)
</script>

<template>
  <div class="ippt-app" :class="mobile ? 'app mobile' : 'app desktop'">

    <!-- Onboarding overlay -->
    <OnboardingModal
      v-if="showOnboarding"
      :mobile="mobile"
      @done="completeOnboarding"
    />

    <!-- ── Desktop side nav ─────────────────────────────────────────────── -->
    <aside v-if="!mobile" class="sidenav">
      <div class="brand">
        <div class="brand-mark">S</div>
        <div>
          <div class="brand-name">Strider</div>
          <div class="brand-tag">IPPT Trainer</div>
        </div>
      </div>

      <button
        v-for="link in SIDENAV_LINKS" :key="link.key"
        class="navlink"
        :class="{ active: tab === link.key }"
        @click="tab = link.key as TabKey"
      >
        <IpptIcon :name="link.icon" :size="16" />
        {{ link.label }}
      </button>

      <div class="sidenav-footer">
        <div class="avatar">{{ profile.name[0] }}</div>
        <div @click="tab = 'profile'" style="cursor:default">
          <div class="who">{{ profile.name }}</div>
          <div class="grp">{{ profile.daysToTest }}d to test</div>
        </div>
      </div>
    </aside>

    <!-- ── Main column ──────────────────────────────────────────────────── -->
    <div class="main">

      <!-- Top bar -->
      <div class="topbar">
        <div class="greet">
          <div class="greet-h">Good morning</div>
          <div class="greet-name">{{ profile.name }}</div>
        </div>
        <span
          class="tier-pill"
          :class="tier.key"
          style="cursor:default"
          @click="tab = 'calculator'"
        >
          <span class="dot">{{ tier.key === 'gold' ? '★' : tier.key === 'silver' ? '✓' : tier.key === 'pass' ? '✓' : '·' }}</span>
          {{ tier.name }}
        </span>
        <span class="pill">
          <span class="swatch" :style="{ background: tier.color }" />
          {{ projected }} pts
        </span>
      </div>

      <!-- Screen content -->
      <div class="content" :class="{ 'pb-tab': mobile }">
        <DashboardScreen
          v-if="tab === 'dashboard'"
          :mobile="mobile"
          @go="(t: string) => tab = t as TabKey"
          @toast="toast"
        />
        <LogScreen
          v-else-if="tab === 'log'"
          :mobile="mobile"
          @go="(t: string) => tab = t as TabKey"
          @toast="toast"
        />
        <CalculatorScreen
          v-else-if="tab === 'calculator'"
          :mobile="mobile"
        />
        <ScheduleScreen
          v-else-if="tab === 'schedule'"
          :mobile="mobile"
          @go="(t: string) => tab = t as TabKey"
          @toast="toast"
        />
        <PlanScreen
          v-else-if="tab === 'plan'"
          :mobile="mobile"
          @toast="toast"
        />
        <AchievementsScreen
          v-else-if="tab === 'achievements'"
          :mobile="mobile"
        />
        <ProfileScreen
          v-else-if="tab === 'profile'"
          :mobile="mobile"
          @toast="toast"
        />
      </div>

      <!-- ── Mobile bottom tab bar ──────────────────────────────────────── -->
      <nav v-if="mobile" class="tabbar">
        <button
          v-for="t in TABS" :key="t.key"
          :class="{ active: tab === t.key }"
          @click="tab = t.key"
        >
          <IpptIcon :name="t.icon" :size="20" />
          {{ t.label }}
          <div class="dot" />
        </button>
      </nav>
    </div>

    <!-- Toast -->
    <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
  </div>
</template>

<!-- Global IPPT design system — intentionally non-scoped so child screens inherit -->
<style>
@import url('https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;600&display=swap');

.ippt-app {
  --bg:           #F5F4EE;
  --bg-deep:      #EBEAE2;
  --surface:      #FFFFFF;
  --surface-2:    #FBFAF6;
  --ink:          oklch(0.22 0.01 80);
  --ink-2:        oklch(0.36 0.012 80);
  --ink-muted:    oklch(0.52 0.012 80);
  --ink-faint:    oklch(0.7 0.008 80);
  --border:       oklch(0.9 0.006 80);
  --border-strong:oklch(0.82 0.008 80);
  --primary:      oklch(0.38 0.07 155);
  --primary-2:    oklch(0.32 0.07 155);
  --primary-ink:  #F5F4EE;
  --primary-tint: oklch(0.95 0.025 155);
  --accent:       oklch(0.7 0.16 65);
  --accent-tint:  oklch(0.95 0.04 75);
  --success:      oklch(0.58 0.13 150);
  --success-tint: oklch(0.94 0.04 150);
  --danger:       oklch(0.55 0.18 25);
  --gold:         oklch(0.78 0.13 85);
  --silver:       oklch(0.72 0.008 80);

  --font-sans: "Public Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;

  font-family: var(--font-sans);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "ss01", "cv11";
}

/* ── App shell ──────────────────────────────────────────────────────────── */
.ippt-app.app { display: flex; overflow: hidden; }
.ippt-app.app.desktop { flex-direction: row; height: calc(100vh - 80px); }
.ippt-app.app.mobile  { flex-direction: column; min-height: calc(100vh - 80px); position: relative; }

/* ── Side nav ───────────────────────────────────────────────────────────── */
.ippt-app .sidenav {
  width: 232px; flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 22px 16px;
  gap: 4px;
  overflow-y: auto;
}
.ippt-app .sidenav .brand {
  display: flex; align-items: center; gap: 10px;
  padding: 4px 10px 18px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}
.ippt-app .sidenav .brand-mark {
  width: 30px; height: 30px;
  background: var(--primary); color: var(--primary-ink);
  border-radius: 8px;
  display: grid; place-items: center;
  font-weight: 700; font-size: 14px;
  letter-spacing: -0.02em; flex-shrink: 0;
}
.ippt-app .sidenav .brand-name { font-size: 15px; font-weight: 700; letter-spacing: -0.01em; }
.ippt-app .sidenav .brand-tag  { font-size: 10.5px; letter-spacing: 0.08em; color: var(--ink-faint); text-transform: uppercase; }
.ippt-app .navlink {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 12px; border-radius: 8px;
  color: var(--ink-2); font-size: 13.5px; font-weight: 500;
  cursor: default; transition: background 120ms, color 120ms;
  border: 1px solid transparent; background: none; width: 100%;
  text-align: left;
}
.ippt-app .navlink:hover { background: var(--surface-2); color: var(--ink); }
.ippt-app .navlink.active {
  background: var(--primary-tint); color: var(--primary-2);
  border-color: color-mix(in oklab, var(--primary) 18%, transparent);
}
.ippt-app .sidenav-footer {
  margin-top: auto; border-top: 1px solid var(--border); padding-top: 12px;
  display: flex; align-items: center; gap: 10px;
}
.ippt-app .sidenav-footer .avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--primary));
  color: #fff; display: grid; place-items: center;
  font-size: 12px; font-weight: 700;
}
.ippt-app .sidenav-footer .who { font-size: 12.5px; font-weight: 600; color: var(--ink); }
.ippt-app .sidenav-footer .grp { font-size: 10.5px; color: var(--ink-muted); }

/* ── Main ───────────────────────────────────────────────────────────────── */
.ippt-app .main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
.ippt-app .topbar {
  display: flex; align-items: center; gap: 16px;
  padding: 20px 24px; border-bottom: 1px solid var(--border);
  background: var(--surface); flex-shrink: 0;
}
.ippt-app.mobile .topbar { padding: 16px; }
.ippt-app .topbar .greet { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.ippt-app .topbar .greet-h { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint); }
.ippt-app .topbar .greet-name { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
.ippt-app .topbar .pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border);
  font-size: 12px; font-weight: 500; background: var(--surface-2); color: var(--ink-2);
  white-space: nowrap;
}
.ippt-app .topbar .pill .swatch { width: 10px; height: 10px; border-radius: 999px; }
.ippt-app .content {
  flex: 1; overflow-y: auto; padding: 24px;
  background: var(--bg);
  min-height: 0;
}
.ippt-app.mobile .content { padding: 16px; }
.ippt-app .content.pb-tab { padding-bottom: 88px; }

/* ── Bottom tab bar ─────────────────────────────────────────────────────── */
.ippt-app .tabbar {
  display: flex; background: var(--surface);
  border-top: 1px solid var(--border);
  padding: 6px 4px 14px; flex-shrink: 0;
}
.ippt-app .tabbar button {
  flex: 1; background: transparent; border: 0;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 8px 4px;
  color: var(--ink-faint); font-size: 10.5px; font-weight: 500;
  letter-spacing: 0.02em; cursor: default; font-family: var(--font-sans);
}
.ippt-app .tabbar button.active { color: var(--primary-2); }
.ippt-app .tabbar button .dot {
  width: 4px; height: 4px; border-radius: 50%;
  background: var(--primary); opacity: 0; margin-top: -2px;
}
.ippt-app .tabbar button.active .dot { opacity: 1; }

/* ── Toast ──────────────────────────────────────────────────────────────── */
.ippt-app .toast {
  position: fixed; left: 50%; transform: translateX(-50%);
  bottom: 88px; background: var(--ink); color: var(--bg);
  padding: 10px 16px; border-radius: 999px;
  font-size: 12.5px; font-weight: 500; font-family: var(--font-sans);
  box-shadow: 0 14px 30px rgba(0,0,0,0.2); z-index: 50;
  animation: ippt-toast-in 220ms ease; white-space: nowrap;
}
.ippt-app.desktop .toast { bottom: 32px; }
@keyframes ippt-toast-in {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}

/* ── Reusable layout helpers ────────────────────────────────────────────── */
.ippt-app .row { display: flex; align-items: center; }
.ippt-app .col { display: flex; flex-direction: column; }
.ippt-app .between { justify-content: space-between; }
.ippt-app .grow { flex: 1; min-width: 0; }
.ippt-app .row.gap-2 { gap: 8px; }
.ippt-app .row.gap-3 { gap: 12px; }
.ippt-app .row.gap-4 { gap: 16px; }
.ippt-app .row.gap-6 { gap: 24px; }
.ippt-app .col.gap-2 { gap: 8px; }
.ippt-app .col.gap-3 { gap: 12px; }
.ippt-app .col.gap-4 { gap: 16px; }
.ippt-app .col.gap-5 { gap: 20px; }
.ippt-app .grid { display: grid; gap: 16px; }
.ippt-app .grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.ippt-app .grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ippt-app .grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.ippt-app.mobile .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.ippt-app.mobile .grid-3-m2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

/* ── Typography ─────────────────────────────────────────────────────────── */
.ippt-app .h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
.ippt-app .h2 { font-size: 16px; font-weight: 600; letter-spacing: -0.005em; margin: 0; }
.ippt-app .h3 { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; margin: 0; text-transform: uppercase; color: var(--ink-muted); }
.ippt-app .muted { color: var(--ink-muted); }
.ippt-app .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.ippt-app .text-sm { font-size: 12.5px; }
.ippt-app .text-xs { font-size: 11.5px; }
.ippt-app .label { font-size: 11.5px; letter-spacing: 0.04em; color: var(--ink-muted); font-weight: 600; text-transform: uppercase; display: block; }

/* ── Card ───────────────────────────────────────────────────────────────── */
.ippt-app .card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 20px;
  display: flex; flex-direction: column; gap: 12px;
}
.ippt-app .card.tight { padding: 16px; }
.ippt-app .card.flat  { background: var(--surface-2); }
.ippt-app .card.dark  { background: var(--ink); color: var(--bg); border-color: transparent; }
.ippt-app .card.primary { background: var(--primary); color: var(--primary-ink); border-color: transparent; }
.ippt-app .card.dark .muted  { color: rgba(245,244,238,0.6); }
.ippt-app .card.primary .muted { color: color-mix(in oklab, var(--primary-ink) 70%, transparent); }
.ippt-app .card-eyebrow {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint);
}
.ippt-app .card.dark .card-eyebrow,
.ippt-app .card.primary .card-eyebrow { color: rgba(245,244,238,0.6); }

/* ── Button ─────────────────────────────────────────────────────────────── */
.ippt-app .btn {
  appearance: none; border: 1px solid var(--border-strong);
  background: var(--surface); color: var(--ink);
  padding: 10px 16px; border-radius: 10px;
  font-size: 13.5px; font-weight: 600; font-family: var(--font-sans);
  cursor: default; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  transition: transform 80ms ease, background 120ms ease;
  letter-spacing: -0.005em;
}
.ippt-app .btn:hover { background: var(--surface-2); }
.ippt-app .btn.primary { background: var(--primary); color: var(--primary-ink); border-color: var(--primary-2); }
.ippt-app .btn.primary:hover { background: var(--primary-2); }
.ippt-app .btn.ghost { background: transparent; border-color: transparent; color: var(--ink-2); }
.ippt-app .btn.ghost:hover { background: var(--bg-deep); }
.ippt-app .btn.accent { background: var(--accent); color: #1a1612; border-color: color-mix(in oklab, var(--accent) 60%, black); }
.ippt-app .btn.sm { padding: 6px 12px; font-size: 12px; border-radius: 8px; }
.ippt-app .btn.full { width: 100%; }
.ippt-app .btn.lg { padding: 14px 20px; font-size: 14.5px; border-radius: 12px; }

/* ── Tag ────────────────────────────────────────────────────────────────── */
.ippt-app .tag {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 8px; border-radius: 6px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.01em;
  background: var(--bg-deep); color: var(--ink-2);
  border: 1px solid var(--border); white-space: nowrap;
}
.ippt-app .tag.primary { background: var(--primary-tint); color: var(--primary-2); border-color: color-mix(in oklab, var(--primary) 18%, transparent); }
.ippt-app .tag.accent  { background: var(--accent-tint);  color: oklch(0.4 0.1 60); border-color: color-mix(in oklab, var(--accent) 30%, transparent); }
.ippt-app .tag.success { background: var(--success-tint); color: oklch(0.35 0.1 150); border-color: color-mix(in oklab, var(--success) 28%, transparent); }

/* ── Progress bar ───────────────────────────────────────────────────────── */
.ippt-app .bar {
  position: relative; height: 6px;
  background: var(--bg-deep); border-radius: 999px; overflow: hidden;
}
.ippt-app .bar > i { display: block; height: 100%; background: var(--primary); border-radius: 999px; transition: width 320ms cubic-bezier(0.16,1,0.3,1); }
.ippt-app .bar.thick { height: 10px; }
.ippt-app .bar.accent > i { background: var(--accent); }
.ippt-app .bar.success > i { background: var(--success); }

/* ── Tier pill ──────────────────────────────────────────────────────────── */
.ippt-app .tier-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 12px 5px 6px; border-radius: 999px;
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.02em;
  background: var(--bg-deep); border: 1px solid var(--border);
}
.ippt-app .tier-pill .dot {
  width: 18px; height: 18px; border-radius: 50%;
  display: grid; place-items: center;
  font-size: 10px; color: #fff; font-weight: 700; flex-shrink: 0;
}
.ippt-app .tier-pill.gold   .dot { background: var(--gold);    color: oklch(0.3 0.06 80); }
.ippt-app .tier-pill.silver .dot { background: var(--silver);  color: oklch(0.3 0.01 80); }
.ippt-app .tier-pill.pass   .dot { background: var(--success); }
.ippt-app .tier-pill.fail   .dot { background: var(--ink-muted); }

/* ── Stat block ─────────────────────────────────────────────────────────── */
.ippt-app .stat { display: flex; flex-direction: column; gap: 4px; }
.ippt-app .stat .v {
  font-family: var(--font-mono); font-size: 26px; font-weight: 600;
  letter-spacing: -0.02em; color: var(--ink); line-height: 1;
  font-variant-numeric: tabular-nums;
}
.ippt-app.mobile .stat .v { font-size: 22px; }
.ippt-app .stat .v .u { font-size: 13px; color: var(--ink-faint); margin-left: 4px; font-weight: 500; }
.ippt-app .stat .k { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-faint); }

/* ── Section head ───────────────────────────────────────────────────────── */
.ippt-app .section-head { display: flex; align-items: flex-end; justify-content: space-between; }
.ippt-app .section-head-left { display: flex; flex-direction: column; gap: 2px; }

/* ── Gauge ──────────────────────────────────────────────────────────────── */
.ippt-app .gauge-wrap { display: flex; align-items: center; justify-content: center; position: relative; }
.ippt-app .gauge-wrap .center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
}
.ippt-app .gauge-num { font-family: var(--font-mono); font-size: 64px; font-weight: 600; letter-spacing: -0.04em; line-height: 1; font-variant-numeric: tabular-nums; }
.ippt-app.mobile .gauge-num { font-size: 52px; }
.ippt-app .gauge-sub { font-size: 12px; color: var(--ink-faint); letter-spacing: 0.06em; text-transform: uppercase; }

/* ── Activity row ───────────────────────────────────────────────────────── */
.ippt-app .activity {
  display: grid; grid-template-columns: 36px 1fr auto;
  gap: 12px; align-items: center;
  padding: 10px 0; border-bottom: 1px solid var(--border);
}
.ippt-app .activity:last-child { border-bottom: 0; }
.ippt-app .activity .ico {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--bg-deep); color: var(--ink-2);
  display: grid; place-items: center;
}
.ippt-app .activity .ico.run    { background: var(--primary-tint);  color: var(--primary-2); }
.ippt-app .activity .ico.push   { background: var(--accent-tint);   color: oklch(0.4 0.1 60); }
.ippt-app .activity .ico.sit    { background: var(--success-tint);  color: oklch(0.35 0.1 150); }
.ippt-app .activity .ico.nsfit  { background: oklch(0.94 0.02 240); color: oklch(0.4 0.1 240); }
.ippt-app .activity .name { font-size: 13.5px; font-weight: 600; }
.ippt-app .activity .meta { font-size: 11.5px; color: var(--ink-muted); }
.ippt-app .activity .right { text-align: right; font-family: var(--font-mono); font-size: 13.5px; font-variant-numeric: tabular-nums; }
.ippt-app .activity .right .pts { display: block; font-size: 10.5px; color: var(--ink-faint); font-family: var(--font-sans); letter-spacing: 0.04em; text-transform: uppercase; }

/* ── Streak strip ───────────────────────────────────────────────────────── */
.ippt-app .streak { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.ippt-app .streak .blk { aspect-ratio: 1; border-radius: 6px; background: var(--bg-deep); position: relative; }
.ippt-app .streak .blk.lv1 { background: color-mix(in oklab, var(--primary) 18%, var(--bg)); }
.ippt-app .streak .blk.lv2 { background: color-mix(in oklab, var(--primary) 36%, var(--bg)); }
.ippt-app .streak .blk.lv3 { background: color-mix(in oklab, var(--primary) 60%, var(--bg)); }
.ippt-app .streak .blk.lv4 { background: var(--primary); }
.ippt-app .streak .blk .lbl { position: absolute; bottom: -16px; left: 0; right: 0; text-align: center; font-size: 9.5px; color: var(--ink-faint); font-family: var(--font-mono); }

/* ── Slider ─────────────────────────────────────────────────────────────── */
.ippt-app .slider {
  -webkit-appearance: none; appearance: none; width: 100%; height: 8px;
  background: var(--bg-deep); border-radius: 999px; outline: none; cursor: pointer;
}
.ippt-app .slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%;
  background: var(--surface); border: 2px solid var(--primary);
  cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.12);
}
.ippt-app .slider::-moz-range-thumb {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--surface); border: 2px solid var(--primary); cursor: pointer;
}

/* ── Input ──────────────────────────────────────────────────────────────── */
.ippt-app .input {
  appearance: none; width: 100%; font: inherit; font-size: 13.5px;
  background: var(--surface); border: 1px solid var(--border-strong);
  border-radius: 8px; padding: 10px 12px; color: var(--ink); outline: none;
}
.ippt-app .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 18%, transparent); }

/* ── Segmented control ──────────────────────────────────────────────────── */
.ippt-app .seg { display: inline-flex; padding: 3px; background: var(--bg-deep); border-radius: 10px; gap: 2px; }
.ippt-app .seg button {
  appearance: none; border: 0; background: transparent;
  padding: 6px 14px; font-size: 12.5px; font-weight: 600;
  border-radius: 7px; color: var(--ink-muted);
  cursor: default; font-family: var(--font-sans);
}
.ippt-app .seg button.active { background: var(--surface); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

/* ── Divider ────────────────────────────────────────────────────────────── */
.ippt-app .divider { height: 1px; background: var(--border); width: 100%; }
.ippt-app .card.dark  .divider,
.ippt-app .card.primary .divider { background: rgba(245,244,238,0.18); }

/* ── Calendar ───────────────────────────────────────────────────────────── */
.ippt-app .cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; font-family: var(--font-mono); font-size: 12.5px; font-variant-numeric: tabular-nums; }
.ippt-app .cal .dow { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-faint); text-align: center; font-family: var(--font-sans); padding-bottom: 4px; }
.ippt-app .cal .day {
  aspect-ratio: 1; border-radius: 8px;
  display: flex; align-items: flex-start; justify-content: flex-end;
  padding: 6px 7px; position: relative;
  border: 1px solid transparent; color: var(--ink-2); cursor: default;
}
.ippt-app .cal .day:hover { background: var(--bg-deep); }
.ippt-app .cal .day.dim { color: var(--ink-faint); }
.ippt-app .cal .day.has::after {
  content: ""; position: absolute; left: 6px; bottom: 6px;
  width: 5px; height: 5px; border-radius: 50%; background: var(--primary);
}
.ippt-app .cal .day.has.nsfit::after { background: var(--accent); }
.ippt-app .cal .day.today  { border-color: var(--primary); color: var(--primary-2); font-weight: 700; }
.ippt-app .cal .day.sel    { background: var(--primary); color: var(--primary-ink); }
.ippt-app .cal .day.sel::after { background: #fff; }

/* ── Badge tile ─────────────────────────────────────────────────────────── */
.ippt-app .badge-tile {
  aspect-ratio: 1; border-radius: 12px;
  background: var(--surface); border: 1px solid var(--border);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 12px; text-align: center; position: relative;
}
.ippt-app .badge-tile.locked { background: var(--surface-2); opacity: 0.6; }
.ippt-app .badge-tile .ring {
  width: 54px; height: 54px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--primary-tint); color: var(--primary-2);
}
.ippt-app .badge-tile.gold   .ring { background: color-mix(in oklab, var(--gold) 22%, var(--bg));   color: oklch(0.45 0.1 80); }
.ippt-app .badge-tile.silver .ring { background: color-mix(in oklab, var(--silver) 35%, var(--bg)); color: oklch(0.4 0.01 80); }
.ippt-app .badge-tile .ttl { font-size: 11.5px; font-weight: 700; }
.ippt-app .badge-tile .sub { font-size: 10px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.04em; }

/* ── Onboarding ─────────────────────────────────────────────────────────── */
.ippt-app .onboard {
  position: absolute; inset: 0; background: var(--surface);
  display: flex; flex-direction: column; z-index: 40;
}
.ippt-app .onboard-hero {
  background: radial-gradient(ellipse at top left, color-mix(in oklab, var(--primary) 28%, transparent), transparent 60%),
              linear-gradient(160deg, var(--primary) 0%, var(--primary-2) 100%);
  color: var(--primary-ink); padding: 36px 28px;
  display: flex; flex-direction: column; justify-content: space-between;
  position: relative; overflow: hidden; flex-shrink: 0;
}
.ippt-app .onboard-hero::before {
  content: ""; position: absolute; right: -50px; bottom: -50px;
  width: 260px; height: 260px; border: 1px solid rgba(255,255,255,0.12); border-radius: 50%;
}
.ippt-app .onboard-hero::after {
  content: ""; position: absolute; right: -120px; bottom: -120px;
  width: 380px; height: 380px; border: 1px solid rgba(255,255,255,0.08); border-radius: 50%;
}
.ippt-app .onboard-body { background: var(--surface); padding: 24px 24px 28px; flex: 1; overflow-y: auto; }
.ippt-app .steps { display: flex; gap: 6px; }
.ippt-app .steps i { display: block; flex: 1; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.25); }
.ippt-app .steps i.done { background: rgba(255,255,255,0.85); }
.ippt-app .steps i.active { background: rgba(255,255,255,0.95); }
.ippt-app .choice {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px; border: 1px solid var(--border-strong);
  border-radius: 12px; background: var(--surface); cursor: default;
}
.ippt-app .choice:hover { border-color: var(--ink-muted); }
.ippt-app .choice.selected { border-color: var(--primary); background: var(--primary-tint); }
.ippt-app .choice .badge {
  width: 40px; height: 40px; border-radius: 10px;
  background: var(--bg-deep); display: grid; place-items: center; flex-shrink: 0;
  font-weight: 700; font-size: 15px;
}
.ippt-app .choice.selected .badge { background: var(--primary); color: var(--primary-ink); }
.ippt-app .choice .title { font-size: 13.5px; font-weight: 600; }
.ippt-app .choice .desc  { font-size: 11.5px; color: var(--ink-muted); }

/* ── Spark ──────────────────────────────────────────────────────────────── */
.ippt-app .spark { width: 100%; display: block; }

/* ── Plan day row ───────────────────────────────────────────────────────── */
.ippt-app .plan-day-row {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px 0; border-bottom: 1px solid var(--border);
}
.ippt-app .plan-day-row:last-child { border-bottom: 0; }
</style>
