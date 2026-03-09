<script setup lang="ts">
import { useNav } from '@/hooks/useNav'

const nav = useNav()

defineProps<{
  crumbs: { label: string; path?: string }[]
}>()
</script>

<template>
  <nav class="app-breadcrumb">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item v-for="(crumb, i) in crumbs" :key="i">
        <span v-if="crumb.path" class="crumb-link" @click="nav.redirectTo(crumb.path)">
          {{ crumb.label }}
        </span>
        <span v-else class="crumb-current">{{ crumb.label }}</span>
      </el-breadcrumb-item>
    </el-breadcrumb>
  </nav>
</template>

<style scoped>
.app-breadcrumb {
  padding: 16px 0 0;
}

.crumb-link {
  cursor: pointer;
  color: var(--el-color-primary);
  transition: opacity 0.15s;
}

.crumb-link:hover {
  opacity: 0.75;
}

.crumb-current {
  color: var(--color-text);
  opacity: 0.55;
}
</style>
