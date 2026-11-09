<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useHouseLayoutsStore, MAX_LAYOUT_NAME } from '@/stores/houseLayouts'
import { useAuthenticationStore } from '@/stores/authentication'
import { useLayoutStateStore } from '@/stores/layoutState'

const { t } = useI18n()
const store = useHouseLayoutsStore()
const layoutStore = useLayoutStateStore()
const { isAuthenticated } = storeToRefs(useAuthenticationStore())

const name = ref('')
const confirmId = ref<string | null>(null)
let confirmTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(confirmTimer))

const current = computed(() => store.layouts.find((l) => l.id === store.currentId) ?? null)

watch(
  () => store.dialogOpen,
  (open) => {
    confirmId.value = null
    if (open && isAuthenticated.value) void store.fetchLayouts()
  },
)

async function saveNew() {
  if (await store.saveNew(name.value)) name.value = ''
}

async function load(id: string) {
  if (await store.load(id)) store.dialogOpen = false
}

function askDelete(id: string) {
  confirmId.value = id
  clearTimeout(confirmTimer)
  confirmTimer = setTimeout(() => (confirmId.value = null), 4000)
}

async function doDelete(id: string) {
  clearTimeout(confirmTimer)
  confirmId.value = null
  await store.remove(id)
}

const when = (ms: number) => new Date(ms).toLocaleDateString()
</script>

<template>
  <el-dialog v-model="store.dialogOpen" :title="t('house.layouts.title')" width="min(560px, 94vw)" append-to-body>
    <div v-if="!isAuthenticated" class="signin">
      <p>{{ t('house.layouts.signIn') }}</p>
      <el-button type="primary" @click="layoutStore.loginDialog.setTrue()">{{ t('nav.login') }}</el-button>
    </div>

    <template v-else>
      <form class="save-row" @submit.prevent="saveNew">
        <el-input v-model="name" :maxlength="MAX_LAYOUT_NAME" :placeholder="t('house.layouts.namePlaceholder')" />
        <el-button native-type="submit" type="primary" :disabled="!name.trim() || store.busy">{{ t('house.layouts.saveNew') }}</el-button>
      </form>
      <el-button v-if="current" class="update-btn" :disabled="store.busy" @click="store.updateCurrent()">
        {{ t('house.layouts.updateCurrent', { name: current.name }) }}
      </el-button>

      <el-skeleton v-if="store.isLoading && !store.layouts.length" :rows="2" animated />
      <p v-else-if="!store.layouts.length" class="empty">{{ t('house.layouts.empty') }}</p>
      <ul v-else class="list">
        <li v-for="l in store.layouts" :key="l.id" class="row" :class="{ current: l.id === store.currentId }">
          <div class="meta">
            <strong class="nm">{{ l.name }}</strong>
            <span class="sub">{{ t('house.layouts.items', { n: l.itemCount }) }} · {{ when(l.updatedAt) }}</span>
          </div>
          <div class="acts">
            <el-button size="small" :disabled="store.busy" @click="load(l.id)">{{ t('house.layouts.load') }}</el-button>
            <el-button v-if="confirmId !== l.id" size="small" :disabled="store.busy" @click="askDelete(l.id)">{{ t('house.layouts.delete') }}</el-button>
            <el-button v-else size="small" type="danger" :disabled="store.busy" @click="doDelete(l.id)">{{ t('house.layouts.confirmDelete') }}</el-button>
          </div>
        </li>
      </ul>
    </template>
  </el-dialog>
</template>

<style scoped>
.signin {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.signin p {
  margin: 0;
}
.save-row {
  display: flex;
  gap: 8px;
}
.update-btn {
  margin: 10px 0 0;
}
.empty {
  color: var(--color-text-tertiary);
  margin: 16px 0 0;
}
.list {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 50vh;
  overflow-y: auto;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}
.row.current {
  border-color: var(--color-primary);
}
.meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.nm {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.acts {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
