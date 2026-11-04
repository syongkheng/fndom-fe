<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useLayoutStateStore } from '@/stores/layoutState'

defineProps<{ message: string }>()

const { t } = useI18n()
const layoutStore = useLayoutStateStore()
</script>

<template>
  <div class="signin-prompt">
    <p class="signin-msg">{{ message }}</p>
    <el-button size="small" type="primary" @click.stop="layoutStore.loginDialog.setTrue()">
      {{ t('nav.login') }}
    </el-button>
  </div>
</template>

<style scoped>
.signin-prompt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 0;
}

.signin-msg {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
}
</style>
