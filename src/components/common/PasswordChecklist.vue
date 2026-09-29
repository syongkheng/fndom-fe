<script lang="ts" setup>
import { computed } from 'vue'
import { CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { getPasswordRequirements } from '@/utilities/PasswordUtils'

const props = defineProps<{
  password: string
}>()

const { t } = useI18n()

const requirements = computed(() =>
  getPasswordRequirements(props.password).map((requirement) => ({
    ...requirement,
    label: t(`auth.password.requirements.${requirement.key}`),
  }))
)
</script>

<template>
  <ul class="password-checklist">
    <li v-for="requirement in requirements" :key="requirement.key" class="password-checklist-item"
      :class="{ met: requirement.met }">
      <el-icon>
        <CircleCheck v-if="requirement.met" />
        <CircleClose v-else />
      </el-icon>
      {{ requirement.label }}
    </li>
  </ul>
</template>

<style scoped>
.password-checklist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.password-checklist-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.55;
  transition: color 0.15s, opacity 0.15s;
}

.password-checklist-item.met {
  color: var(--el-color-success);
  opacity: 1;
}
</style>
