<script setup lang="ts">
import { ArrowLeft } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { useNav } from '@/hooks/useNav'

const props = withDefaults(defineProps<{ to?: string }>(), { to: '/dashboard' })

const { t } = useI18n()
const nav = useNav()
</script>

<template>
  <el-button
    circle
    size="small"
    class="page-back"
    :title="t('common.back')"
    :aria-label="t('common.back')"
    @click="nav.redirectTo(props.to)"
  >
    <el-icon><ArrowLeft /></el-icon>
  </el-button>
</template>

<style scoped>
.page-back {
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
