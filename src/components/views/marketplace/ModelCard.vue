<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLayoutStateStore } from '@/stores/layoutState'
import type { LLMModel } from '@/interfaces/Marketplace.model'

const props = defineProps<{ model: LLMModel; isAuthenticated?: boolean }>()

const router      = useRouter()
const layoutStore = useLayoutStateStore()
const { t }       = useI18n()

function handleTryChat() {
  if (props.isAuthenticated) {
    router.push(`/llm/chat?model=${props.model.id}`)
  } else {
    layoutStore.loginDialog.toggle()
  }
}

const BADGE_STYLE: Record<string, string> = {
  Popular:      'badge--popular',
  'Best Value': 'badge--value',
  Fastest:      'badge--fast',
  New:          'badge--new',
}

const badgeLabel = computed(() => {
  if (!props.model.badge) return ''
  const map: Record<string, string> = {
    Popular:      t('marketplace.card.badges.popular'),
    'Best Value': t('marketplace.card.badges.bestValue'),
    Fastest:      t('marketplace.card.badges.fastest'),
    New:          t('marketplace.card.badges.new'),
  }
  return map[props.model.badge] ?? props.model.badge
})
</script>

<template>
  <div class="model-card" :style="{ '--accent': model.providerColor }">

    <div class="card-head">
      <span class="provider-dot" />
      <span class="provider-name">{{ model.provider }}</span>
      <span v-if="model.badge" class="badge" :class="BADGE_STYLE[model.badge]">
        {{ badgeLabel }}
      </span>
    </div>

    <div class="card-body">
      <div class="model-name">{{ model.name }}</div>
      <code class="model-id">{{ model.modelId }}</code>
      <p class="model-desc">{{ t(`marketplace.models.${model.id}.description`) }}</p>
    </div>

    <div class="card-specs">
      <div class="spec">
        <span class="spec-label">{{ t('marketplace.card.context') }}</span>
        <span class="spec-value">{{ model.contextWindow }}</span>
      </div>
      <div class="spec-divider" />
      <div class="spec">
        <span class="spec-label">{{ t('marketplace.card.maxOutput') }}</span>
        <span class="spec-value">{{ model.maxOutput }}</span>
      </div>
    </div>

    <div class="card-pricing">
      <div class="price-row">
        <span class="price-label">{{ t('marketplace.card.input') }}</span>
        <span class="price-value">{{ model.inputPrice }} <span class="price-unit">{{ t('marketplace.card.perMtok') }}</span></span>
      </div>
      <div class="price-row">
        <span class="price-label">{{ t('marketplace.card.output') }}</span>
        <span class="price-value">{{ model.outputPrice }} <span class="price-unit">{{ t('marketplace.card.perMtok') }}</span></span>
      </div>
    </div>

    <div class="card-tags">
      <span v-for="tag in model.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>

    <button class="try-btn" @click="handleTryChat()">
      {{ t('marketplace.card.tryChat') }} <span class="try-arrow">→</span>
    </button>

  </div>
</template>

<style scoped>
.model-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--accent);
  border-radius: 12px;
  background: var(--color-background-soft);
  transition: box-shadow 0.18s, border-color 0.18s, transform 0.18s;
  cursor: default;
}

.model-card:hover {
  box-shadow: 0 4px 20px color-mix(in srgb, var(--color-heading) 8%, transparent);
  transform: translateY(-1px);
}

/* Head */
.card-head {
  display: flex;
  align-items: center;
  gap: 7px;
}

.provider-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.provider-name {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.5;
  flex: 1;
}

.badge {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge--popular {
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  color: var(--el-color-primary);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 25%, transparent);
}
.badge--value {
  background: color-mix(in srgb, var(--el-color-success) 12%, transparent);
  color: var(--el-color-success);
  border: 1px solid color-mix(in srgb, var(--el-color-success) 25%, transparent);
}
.badge--fast {
  background: color-mix(in srgb, #f59e0b 12%, transparent);
  color: #b45309;
  border: 1px solid color-mix(in srgb, #f59e0b 30%, transparent);
}
.badge--new {
  background: color-mix(in srgb, #6366f1 12%, transparent);
  color: #4f46e5;
  border: 1px solid color-mix(in srgb, #6366f1 30%, transparent);
}

/* Body */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--color-heading);
  letter-spacing: -0.2px;
  line-height: 1.2;
}

.model-id {
  font-size: 0.7rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--color-text);
  opacity: 0.35;
  margin-top: 1px;
}

.model-desc {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.6;
  line-height: 1.55;
  margin: 6px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Specs */
.card-specs {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-background-mute);
  border-radius: 8px;
}

.spec {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.spec-label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text);
  opacity: 0.4;
}

.spec-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-heading);
}

.spec-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
}

/* Pricing */
.card-pricing {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.price-label {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.4;
}

.price-value {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-heading);
}

.price-unit {
  font-size: 0.7rem;
  font-weight: 400;
  opacity: 0.5;
}

/* Tags */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--color-background-mute);
  color: var(--color-text);
  opacity: 0.6;
  border: 1px solid var(--color-border);
}

/* Try button */
.try-btn {
  margin-top: auto;
  width: 100%;
  padding: 10px 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.try-btn:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

.try-arrow {
  transition: transform 0.15s;
}

.try-btn:hover .try-arrow {
  transform: translateX(3px);
}
</style>
