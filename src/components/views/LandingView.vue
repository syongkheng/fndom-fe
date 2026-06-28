<script setup lang="ts">
import { useAuthenticationStore } from '@/stores/authentication'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const authStore = useAuthenticationStore()
const router    = useRouter()
const { t }     = useI18n()
const { isAuthenticated } = storeToRefs(authStore)
</script>

<template>
  <div class="hub">

    <div class="hub-header">
      <p class="hub-eyebrow">{{ t('home.eyebrow') }}</p>
      <p v-if="isAuthenticated" class="hub-greeting">
        {{ t('home.greeting') }}{{ authStore.userProfile.username }}.
      </p>
      <h1 class="hub-heading">{{ t('home.heading') }}</h1>
      <p class="hub-subtitle">{{ t('home.subtitle') }}</p>
    </div>

    <div class="service-grid">

      <!-- Travel -->
      <div class="service-card" @click="router.push('/travel')">
        <div class="service-icon">✈️</div>
        <div class="service-body">
          <h2 class="service-name">{{ t('home.travel.label') }}</h2>
          <p class="service-desc">{{ t('home.travel.desc') }}</p>
        </div>
        <el-button type="primary" size="large" class="service-cta">
          {{ t('home.travel.cta') }}
        </el-button>
      </div>

      <!-- AI Marketplace -->
      <div class="service-card" @click="router.push('/llm')">
        <div class="service-icon">🤖</div>
        <div class="service-body">
          <h2 class="service-name">{{ t('home.ai.label') }}</h2>
          <p class="service-desc">{{ t('home.ai.desc') }}</p>
        </div>
        <el-button type="primary" size="large" class="service-cta">
          {{ t('home.ai.cta') }}
        </el-button>
      </div>

    </div>

  </div>
</template>

<style scoped>
.hub {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px);
  padding: 48px 16px 64px;
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
}

.hub-header {
  text-align: center;
  margin-bottom: 48px;
}

.hub-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 10px;
}

.hub-greeting {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.55;
  margin-bottom: 6px;
}

.hub-heading {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: var(--color-heading);
  margin-bottom: 10px;
  line-height: 1.15;
}

.hub-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

/* Service grid */
.service-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
}

.service-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  padding: 36px 32px;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-background-soft);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.15s;
}

.service-card:hover {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 4%, var(--color-background-soft));
  box-shadow: 0 8px 32px color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  transform: translateY(-2px);
}

.service-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  font-size: 1.75rem;
  flex-shrink: 0;
  transition: background 0.15s;
}

.service-card:hover .service-icon {
  background: color-mix(in srgb, var(--el-color-primary) 18%, transparent);
}

.service-body {
  flex: 1;
}

.service-name {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-heading);
  margin-bottom: 8px;
  letter-spacing: -0.2px;
}

.service-desc {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.service-cta {
  align-self: flex-start;
}

/* Responsive */
@media (max-width: 600px) {
  .hub-heading { font-size: 1.75rem; }
  .service-grid { grid-template-columns: 1fr; }
  .service-card { padding: 28px 24px; }
}
</style>
