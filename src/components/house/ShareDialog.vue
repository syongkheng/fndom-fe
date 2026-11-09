<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useHouseSharesStore } from '@/stores/houseShares'
import { useHouseLayoutsStore, MAX_LAYOUT_NAME } from '@/stores/houseLayouts'
import { useHousePlanStore } from '@/stores/housePlan'
import { useAuthenticationStore } from '@/stores/authentication'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const store = useHouseSharesStore()
const layouts = useHouseLayoutsStore()
const house = useHousePlanStore()
const layoutStore = useLayoutStateStore()
const toast = useToast()
const { isAuthenticated } = storeToRefs(useAuthenticationStore())

const name = ref('')
const madeUrl = ref('')
const confirmToken = ref<string | null>(null)
let confirmTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(confirmTimer))

const defaultName = computed(() => layouts.layouts.find((l) => l.id === layouts.currentId)?.name ?? t('house.share.defaultName'))

watch(
  () => store.dialogOpen,
  (open) => {
    confirmToken.value = null
    madeUrl.value = ''
    if (!open) return
    name.value = defaultName.value
    if (isAuthenticated.value) void store.fetchShares()
  },
)

async function copy(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast.success(t('house.share.copied'))
  } catch {
    toast.error(t('house.share.copyFailed'))
  }
}

async function create() {
  const url = await store.create(name.value)
  if (!url) return
  madeUrl.value = url
  void copy(url)
}

function askRevoke(token: string) {
  confirmToken.value = token
  clearTimeout(confirmTimer)
  confirmTimer = setTimeout(() => (confirmToken.value = null), 4000)
}
async function doRevoke(token: string) {
  clearTimeout(confirmTimer)
  confirmToken.value = null
  await store.revoke(token)
}

const when = (ms: number) => new Date(ms).toLocaleDateString()
</script>

<template>
  <el-dialog v-model="store.dialogOpen" :title="t('house.share.title')" width="min(560px, 94vw)" append-to-body>
    <div v-if="!isAuthenticated" class="signin">
      <p>{{ t('house.share.signIn') }}</p>
      <el-button type="primary" @click="layoutStore.loginDialog.setTrue()">{{ t('nav.login') }}</el-button>
    </div>

    <template v-else>
      <p class="note">{{ t('house.share.note') }}</p>
      <form class="make" @submit.prevent="create">
        <el-input v-model="name" :maxlength="MAX_LAYOUT_NAME" :placeholder="t('house.share.namePlaceholder')" />
        <el-button native-type="submit" type="primary" :disabled="!name.trim() || store.busy || !house.items.length">{{ t('house.share.create') }}</el-button>
      </form>
      <p v-if="!house.items.length" class="note warn">{{ t('house.share.emptyPlan') }}</p>

      <div v-if="madeUrl" class="made">
        <el-input :model-value="madeUrl" readonly @focus="($event.target as HTMLInputElement).select()" />
        <el-button @click="copy(madeUrl)">{{ t('house.share.copy') }}</el-button>
      </div>

      <h4 v-if="store.shares.length" class="bp-label head">{{ t('house.share.existing') }}</h4>
      <el-skeleton v-if="store.isLoading && !store.shares.length" :rows="2" animated />
      <ul v-else-if="store.shares.length" class="list">
        <li v-for="s in store.shares" :key="s.token" class="row">
          <div class="meta">
            <strong class="nm">{{ s.name }}</strong>
            <span class="sub">{{ t('house.layouts.items', { n: s.itemCount }) }} · {{ when(s.createdAt) }}</span>
          </div>
          <div class="acts">
            <el-button size="small" @click="copy(store.urlFor(s.token))">{{ t('house.share.copy') }}</el-button>
            <el-button v-if="confirmToken !== s.token" size="small" :disabled="store.busy" @click="askRevoke(s.token)">{{ t('house.share.revoke') }}</el-button>
            <el-button v-else size="small" type="danger" :disabled="store.busy" @click="doRevoke(s.token)">{{ t('house.share.confirmRevoke') }}</el-button>
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
.signin p,
.note {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.note.warn {
  margin: 8px 0 0;
  color: var(--el-color-warning-dark-2, #b26a00);
}
.make,
.made {
  display: flex;
  gap: 8px;
}
.made {
  margin-top: 10px;
}
.head {
  margin: 18px 0 8px;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 40vh;
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
