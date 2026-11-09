<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useHousePlanStore } from '@/stores/housePlan'

const { t } = useI18n()
const store = useHousePlanStore()

// Ctrl on Windows/Linux is Cmd on macOS; the sheet says Ctrl/Cmd once rather than guessing the platform.
const rows: { keys: string; action: string }[] = [
  { keys: 'house.help.k.click', action: 'house.help.a.click' },
  { keys: 'house.help.k.drag', action: 'house.help.a.drag' },
  { keys: 'house.help.k.corner', action: 'house.help.a.corner' },
  { keys: 'house.help.k.rotateHandle', action: 'house.help.a.rotateHandle' },
  { keys: 'house.help.k.doubleClick', action: 'house.help.a.doubleClick' },
  { keys: 'house.help.k.rightClick', action: 'house.help.a.rightClick' },
  { keys: 'house.help.k.alt', action: 'house.help.a.alt' },
  { keys: 'R', action: 'house.help.a.rotate' },
  { keys: '[  ]', action: 'house.help.a.rotateStep' },
  { keys: '← ↑ → ↓', action: 'house.help.a.nudge' },
  { keys: 'Enter', action: 'house.help.a.enter' },
  { keys: 'Delete', action: 'house.help.a.delete' },
  { keys: 'Ctrl/Cmd + D', action: 'house.help.a.duplicate' },
  { keys: 'Ctrl/Cmd + C / X / V', action: 'house.help.a.clipboard' },
  { keys: 'Ctrl/Cmd + Z', action: 'house.help.a.undo' },
  { keys: 'Ctrl/Cmd + Shift + Z', action: 'house.help.a.redo' },
  { keys: 'F', action: 'house.help.a.fit' },
  { keys: 'Esc', action: 'house.help.a.esc' },
  { keys: '?', action: 'house.help.a.help' },
]
const label = (k: string) => (k.startsWith('house.') ? t(k) : k)
</script>

<template>
  <el-dialog v-model="store.helpOpen" :title="t('house.help.title')" width="min(560px, 94vw)" append-to-body>
    <table class="keys">
      <tr v-for="r in rows" :key="r.action">
        <td><kbd>{{ label(r.keys) }}</kbd></td>
        <td>{{ t(r.action) }}</td>
      </tr>
    </table>
  </el-dialog>
</template>

<style scoped>
.keys {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
td {
  padding: 6px 4px;
  border-bottom: 1px solid var(--color-divider);
  vertical-align: top;
}
td:first-child {
  white-space: nowrap;
  padding-right: 16px;
}
kbd {
  font: 600 12px var(--font-mono);
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
}
</style>
