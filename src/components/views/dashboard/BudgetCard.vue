<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useNav } from '@/hooks/useNav'
import { useBudgetStore } from '@/stores/budget'
import { useAuthenticationStore } from '@/stores/authentication'
import SignInPrompt from './SignInPrompt.vue'

const { t } = useI18n()
const nav = useNav()
const budgetStore = useBudgetStore()
const { myTables, isLoadingList } = storeToRefs(budgetStore)
const { isAuthenticated } = storeToRefs(useAuthenticationStore())

const load = () => {
  if (isAuthenticated.value) budgetStore.fetchTables()
}
onMounted(load)
watch(isAuthenticated, load)

// Most recently created first.
const recent = computed(() => [...myTables.value].sort((a, b) => b.createdDt - a.createdDt).slice(0, 3))

const formatAmount = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 })

const pct = (actual: number, budget: number) => (budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0)
</script>

<template>
  <div
    class="budget-card bp-panel"
    role="button"
    tabindex="0"
    @click="nav.redirectTo('/budget')"
    @keyup.enter="nav.redirectTo('/budget')"
  >
    <p class="bp-label budget-card-title">{{ t('dashboard.budget.title') }}</p>

    <SignInPrompt v-if="!isAuthenticated" :message="t('dashboard.budget.signIn')" />

    <el-skeleton v-else-if="isLoadingList && !recent.length" :rows="2" animated />

    <p v-else-if="!recent.length" class="budget-card-desc">{{ t('dashboard.budget.desc') }}</p>

    <ul v-else class="budget-list">
      <li v-for="tbl in recent" :key="tbl.sessionId" class="budget-row" @click.stop="nav.redirectTo(`/budget/${tbl.sessionId}`)">
        <div class="budget-row-head">
          <span class="budget-row-name">{{ tbl.name }}</span>
          <span class="budget-row-sum">{{ formatAmount(tbl.sumActual) }} / {{ formatAmount(tbl.sumBudget) }}</span>
        </div>
        <div class="budget-bar" aria-hidden="true">
          <div
            class="budget-bar-fill"
            :class="{ over: tbl.sumActual > tbl.sumBudget && tbl.sumBudget > 0 }"
            :style="{ width: pct(tbl.sumActual, tbl.sumBudget) + '%' }"
          />
        </div>
      </li>
    </ul>

    <span class="budget-card-open">{{ t('dashboard.budget.open') }}</span>
  </div>
</template>

<style scoped>
.budget-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.budget-card:hover {
  border-color: var(--color-primary);
  background: var(--color-background-mute);
}

.budget-card-title {
  margin: 0 0 10px;
}

.budget-card-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  margin: 0;
}

.budget-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.budget-row {
  cursor: pointer;
}

.budget-row-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.82rem;
  margin-bottom: 5px;
}

.budget-row-name {
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.budget-row-sum {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text);
}

.budget-bar {
  height: 4px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
}

.budget-bar-fill {
  height: 100%;
  background: var(--color-primary);
}

.budget-bar-fill.over {
  background: var(--color-danger);
}

.budget-card-open {
  align-self: flex-start;
  margin-top: auto;
  padding-top: 12px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-primary);
}
</style>
