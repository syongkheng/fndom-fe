<script setup lang="ts">
import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import type { MrtStationInformation } from '@/interfaces/MrtStationInformation.model'
import type { PphsRecord } from '@/interfaces/PphsRecord.model'
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  records: PphsRecord[]
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
}>()

const mrtByAddress = ref<Record<string, MrtStationInformation[]>>({})
const loadingMrt = ref(false)

const fetchMrt = async () => {
  const mapped = props.records.filter((r) => r.source === 'database')
  if (!mapped.length) return
  loadingMrt.value = true
  try {
    const requests = mapped.map((r) =>
      HttpClient.post(ApiRoute.PPHS.GET_NEAREST_MRT_STATIONS, {
        lat: r.lat,
        lng: r.lng,
        limit: 3,
      })
        .then((res) => ({ address: r.address, rows: res.data.data.rows as MrtStationInformation[] }))
        .catch(() => ({ address: r.address, rows: [] }))
    )
    const results = await Promise.all(requests)
    results.forEach((r) => { mrtByAddress.value[r.address] = r.rows })
  } finally {
    loadingMrt.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      mrtByAddress.value = {}
      fetchMrt()
    }
  }
)

const flatTypeLabel: Record<string, string> = {
  '2-room': '2-Room',
  '3-room': '3-Room',
  '4-room': '4-Room',
}

const rows = [
  { label: 'Town', key: 'town' },
  { label: 'Address', key: 'address' },
  { label: 'Expiry', key: 'expiry' },
  { label: 'Status', key: 'status' },
  { label: '2-Room', key: 'flat-2-room' },
  { label: '3-Room', key: 'flat-3-room' },
  { label: '4-Room', key: 'flat-4-room' },
  { label: '1st MRT', key: 'mrt-0' },
  { label: '2nd MRT', key: 'mrt-1' },
  { label: '3rd MRT', key: 'mrt-2' },
]

const getCellValue = (record: PphsRecord, key: string): string => {
  if (key === 'town') return record.town
  if (key === 'address') return record.address
  if (key === 'expiry') return record.siteExpiry
  if (key === 'status') return record.source === 'database' ? 'On Map' : 'Unmapped'
  if (key === 'flat-2-room') return record.flatTypes?.['2-room'] ?? '—'
  if (key === 'flat-3-room') return record.flatTypes?.['3-room'] ?? '—'
  if (key === 'flat-4-room') return record.flatTypes?.['4-room'] ?? '—'

  if (key.startsWith('mrt-')) {
    const idx = Number(key.split('-')[1])
    if (record.source !== 'database') return 'Unmapped'
    if (loadingMrt.value) return '...'
    const stations = mrtByAddress.value[record.address]
    if (!stations?.[idx]) return '—'
    const s = stations[idx]
    return `${s.station} (~${Number(s.distance_m).toFixed(0)}m)`
  }

  return '—'
}

const isStatusCell = (key: string) => key === 'status'
const isMrtSection = (key: string) => key.startsWith('mrt-')
const isFlatSection = (key: string) => key.startsWith('flat-')
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="Compare Listings"
    :width="records.length === 3 ? '780px' : '580px'"
    style="max-width: 94vw"
  >
    <div class="compare-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th class="col-label"></th>
            <th v-for="record in records" :key="record.address" class="col-record">
              <div class="record-header">
                <span class="record-town">{{ record.town }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in rows" :key="row.key">
            <tr
              :class="{
                'row--section-start': row.key === 'flat-2-room' || row.key === 'mrt-0',
              }"
            >
              <td class="cell-label">{{ row.label }}</td>
              <td
                v-for="record in records"
                :key="record.address"
                class="cell-value"
                :class="{
                  'cell--status-mapped': isStatusCell(row.key) && record.source === 'database',
                  'cell--status-unmapped': isStatusCell(row.key) && record.source !== 'database',
                  'cell--muted': isMrtSection(row.key) && !mrtByAddress[record.address]?.length,
                }"
              >
                {{ getCellValue(record, row.key) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">Close</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.compare-wrap {
  overflow-x: auto;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.col-label {
  width: 90px;
}

.col-record {
  min-width: 160px;
}

.record-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
}

.record-town {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--color-heading);
}

.compare-table th {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 2px solid var(--color-border);
  background: var(--color-background-mute);
}

.compare-table td {
  padding: 7px 12px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
  color: var(--color-text);
  line-height: 1.4;
}

.cell-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
  opacity: 0.5;
  white-space: nowrap;
}

.row--section-start td {
  border-top: 2px solid var(--color-border);
}

.cell--status-mapped {
  color: var(--el-color-success);
  font-weight: 600;
}

.cell--status-unmapped {
  color: var(--el-color-danger);
  font-weight: 600;
}

.cell--muted {
  opacity: 0.4;
  font-style: italic;
}
</style>
