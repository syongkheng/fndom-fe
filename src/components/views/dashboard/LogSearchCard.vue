<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNav } from '@/hooks/useNav'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const nav = useNav()
const toast = useToast()

const requestId = ref('')

function search() {
  const id = requestId.value.trim()
  if (!id) return

  if (!/^req_[0-9a-f]{5}$/i.test(id)) {
    toast.error(t('admin.logSearcher.invalidFormat'))
    return
  }

  nav.redirectTo('/admin/log-searcher', { query: { requestId: id } })
}
</script>

<template>
  <div class="log-search-card">
    <p class="log-search-title">{{ t('admin.logSearcher.cardTile') }}</p>

    <div class="log-search-bar">
      <el-input
        v-model="requestId"
        :placeholder="t('admin.logSearcher.placeholder')"
        clearable
        @keyup.enter="search"
      />
      <el-button type="primary" @click="search">
        {{ t('admin.logSearcher.search') }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.log-search-card {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: 340px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
}

.log-search-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
  opacity: 0.5;
  margin-bottom: 10px;
}

.log-search-bar {
  display: flex;
  gap: 8px;
}
</style>
