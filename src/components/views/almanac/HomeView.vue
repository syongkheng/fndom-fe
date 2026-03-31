<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  HEAVENLY, EARTHLY, MONTH_ZH, DAY_ZH, ZODIAC, OFFICER, OFFICER_YI, OFFICER_JI,
  LUNAR_DATA, daysBetween, getLunarDate, getStemBranch, getOfficerIdx,
} from '@/utilities/lunarCalendar'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS_EN  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_ZH  = ['日', '一', '二', '三', '四', '五', '六']

const MONTH_NAMES: Record<string, string> = {
  '2026-06':'Jun 2026','2026-07':'Jul 2026','2026-08':'Aug 2026','2026-09':'Sep 2026',
  '2026-10':'Oct 2026','2026-11':'Nov 2026','2026-12':'Dec 2026',
  '2027-01':'Jan 2027','2027-02':'Feb 2027','2027-03':'Mar 2027','2027-04':'Apr 2027',
  '2027-05':'May 2027','2027-06':'Jun 2027','2027-07':'Jul 2027','2027-08':'Aug 2027',
  '2027-09':'Sep 2027','2027-10':'Oct 2027','2027-11':'Nov 2027','2027-12':'Dec 2027',
}

// ── Calculation logic ─────────────────────────────────────────────────────────

interface DayEntry {
  iso: string; y: number; m: number; d: number; dow: number
  sb: string; officer: string; yi: string[]; ji: string[]
  yearStr: string; dateStr: string; mStr: string; dStr: string
  monthKey: string
}

function buildAllDays(): DayEntry[] {
  const days: DayEntry[] = []
  const start = new Date(2026, 5, 1)
  const end   = new Date(2027, 11, 31)
  for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const y = cur.getFullYear(), m = cur.getMonth() + 1, d = cur.getDate()
    const oi = getOfficerIdx(y, m, d)
    const lf = getLunarDate(y, m, d)
    const iso = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    days.push({
      iso, y, m, d, dow: cur.getDay(),
      sb: getStemBranch(y, m, d),
      officer: OFFICER[oi],
      yi: OFFICER_YI[oi],
      ji: OFFICER_JI[oi],
      ...lf,
      monthKey: iso.slice(0, 7),
    })
  }
  return days
}

const ALL_DAYS = buildAllDays()
const ALL_MONTHS = [...new Set(ALL_DAYS.map(d => d.monthKey))]

// ── Reactive state ────────────────────────────────────────────────────────────

const selectedMonth = ref('all')
const searchQuery   = ref('')

const filteredDays = computed(() => {
  const raw = searchQuery.value.trim()
  const q   = raw.toLowerCase()
  if (raw.length >= 2) {
    return ALL_DAYS.filter(d =>
      d.iso.includes(q) ||
      d.yearStr.includes(raw) || d.dateStr.includes(raw) ||
      d.mStr.includes(raw)    || d.dStr.includes(raw) ||
      d.sb.includes(raw)      || d.officer.includes(raw)
    )
  }
  if (selectedMonth.value !== 'all') {
    return ALL_DAYS.filter(d => d.monthKey === selectedMonth.value)
  }
  return ALL_DAYS
})

interface DisplayRow {
  type: 'day' | 'divider'
  day?: DayEntry
  monthName?: string
}

const displayRows = computed((): DisplayRow[] => {
  const rows: DisplayRow[] = []
  let lastMonth = ''
  for (const day of filteredDays.value) {
    if (day.monthKey !== lastMonth) {
      rows.push({ type: 'divider', monthName: MONTH_NAMES[day.monthKey] ?? day.monthKey })
      lastMonth = day.monthKey
    }
    rows.push({ type: 'day', day })
  }
  return rows
})
</script>

<template>
  <div class="almanac-page">

    <!-- Header -->
    <div class="almanac-header">
      <div class="almanac-header-text">
        <h1 class="almanac-title">黄历 Chinese Almanac</h1>
        <p class="almanac-sub">1 Jun 2026 — 31 Dec 2027 &nbsp;·&nbsp; 宜忌参考</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="almanac-toolbar">
      <el-select v-model="selectedMonth" size="small" style="width: 140px">
        <el-option value="all" label="All months" />
        <el-option v-for="mo in ALL_MONTHS" :key="mo" :value="mo" :label="MONTH_NAMES[mo] ?? mo" />
      </el-select>
      <el-input
        v-model="searchQuery"
        size="small"
        placeholder="Search date or 农历…"
        clearable
        style="width: 200px"
      />
      <span class="toolbar-count">{{ filteredDays.length }} days</span>
    </div>

    <!-- Table -->
    <div class="almanac-table-wrap">
      <table class="almanac-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Day</th>
            <th>农历 Lunar</th>
            <th>干支 / 值神</th>
            <th class="th-yi">宜 Auspicious</th>
            <th class="th-ji">忌 Inauspicious</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="displayRows.length === 0">
            <tr><td colspan="6" class="no-results">No matching dates found.</td></tr>
          </template>
          <template v-for="(row, idx) in displayRows" :key="idx">
            <!-- Month divider -->
            <tr v-if="row.type === 'divider'" class="month-divider">
              <td colspan="6">{{ row.monthName }}</td>
            </tr>
            <!-- Day row -->
            <tr v-else-if="row.day" class="day-row">
              <td class="col-date">{{ row.day.iso }}</td>
              <td class="col-dow" :class="row.day.dow === 0 ? 'is-sun' : row.day.dow === 6 ? 'is-sat' : ''">
                <div class="dow-en">{{ DAYS_EN[row.day.dow] }}</div>
                <div class="dow-zh">星期{{ DAYS_ZH[row.day.dow] }}</div>
              </td>
              <td class="col-lunar">
                <div class="lunar-year">{{ row.day.yearStr }}</div>
                <div class="lunar-date">{{ row.day.dateStr }}</div>
              </td>
              <td class="col-sb">
                <div class="sb-main">{{ row.day.sb }}</div>
                <div class="sb-officer">{{ row.day.officer }}日</div>
              </td>
              <td class="col-yi">
                <span v-for="t in row.day.yi" :key="t" class="tag tag-yi">{{ t }}</span>
              </td>
              <td class="col-ji">
                <span v-for="t in row.day.ji" :key="t" class="tag tag-ji">{{ t }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style scoped>
.almanac-page {
  min-height: 100vh;
  background: #f7f6f2;
  color: #1a1a1a;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* Header */
.almanac-header {
  background: #1a1a1a;
  color: #f5f0e8;
  padding: 1.25rem 2rem;
  display: flex;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}

.almanac-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #f5f0e8;
  margin: 0;
}

.almanac-sub {
  font-size: 13px;
  color: #888;
  margin: 3px 0 0;
}

/* Toolbar */
.almanac-toolbar {
  background: #fff;
  border-bottom: 1px solid #e8e5df;
  padding: 0.65rem 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbar-count {
  font-size: 12px;
  color: #888;
  margin-left: auto;
}

/* Table wrapper */
.almanac-table-wrap {
  padding: 1rem 2rem 3rem;
  overflow-x: auto;
}

/* Table */
.almanac-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  font-size: 13px;
}

.almanac-table thead th {
  background: #1a1a1a;
  color: #f5f0e8;
  padding: 10px;
  text-align: left;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.th-yi { color: #a8dfc0 !important; }
.th-ji { color: #f5b8b0 !important; }

.day-row {
  border-bottom: 1px solid #f0ede8;
}

.day-row:last-child { border-bottom: none; }
.day-row:hover { background: #fdfcf8; }

.almanac-table td {
  padding: 8px 10px;
  vertical-align: top;
}

/* Month divider */
.month-divider td {
  background: #f7f6f2;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Columns */
.col-date {
  font-weight: 600;
  white-space: nowrap;
  min-width: 100px;
}

.col-dow {
  text-align: center;
  min-width: 52px;
}

.dow-en {
  font-size: 13px;
  font-weight: 600;
}

.dow-zh {
  font-size: 11px;
  color: #999;
}

.is-sat .dow-en { color: #1D9E75; }
.is-sun .dow-en { color: #c0392b; }

.col-lunar {
  font-size: 12px;
  color: #555;
  min-width: 160px;
}

.lunar-year {
  color: #888;
  font-size: 11px;
  margin-bottom: 1px;
}

.lunar-date {
  font-weight: 500;
  color: #333;
}

.col-sb { min-width: 80px; }

.sb-main {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.sb-officer {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}

.col-yi,
.col-ji {
  min-width: 160px;
}

.tag {
  display: inline-block;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  margin: 1px 2px 1px 0;
  white-space: nowrap;
}

.tag-yi {
  background: #e8f5ee;
  color: #0a6640;
  border: 1px solid #b8dfca;
}

.tag-ji {
  background: #fdecea;
  color: #8b1a1a;
  border: 1px solid #f0c0b8;
}

.no-results {
  text-align: center;
  padding: 3rem;
  color: #999;
  font-size: 15px;
}

@media (max-width: 700px) {
  .almanac-header,
  .almanac-toolbar,
  .almanac-table-wrap {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  .col-sb { display: none; }
}
</style>
