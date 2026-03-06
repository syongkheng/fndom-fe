<script setup lang="ts">
import { ref } from 'vue'
import { useNav } from '@/hooks/useNav'
import { useKopRegistration } from '@/hooks/useKopRegistration'

const nav = useNav()
const { isRegistrationOpen } = useKopRegistration()

const showClosedDialog = ref(false)

const handleRegistrationClick = () => {
  if (!isRegistrationOpen.value) {
    showClosedDialog.value = true
    return
  }
  nav.redirectTo('/ks/kop')
}
</script>

<template>
  <div class="page-container">
    <section class="hero">
      <h1 class="kingdom-title">Kingdom 236</h1>
      <p class="kingdom-subtitle">"If everyone is moving forward together, then success takes care of itself." — Henry Ford</p>
    </section>

    <section class="kop-section">
      <h2 class="section-title">Kingdom of Power Preparation</h2>

      <div class="kop-info">
        <div class="info-item">
          <span class="label">Preparation Week</span>
          <span class="value">23 Mar – 28 Mar</span>
        </div>
        <div class="info-item">
          <span class="label">KvK Castle Battle</span>
          <span class="value">28 Mar</span>
        </div>
      </div>

      <div class="banners">
        <el-card class="banner-card" shadow="hover" @click="handleRegistrationClick">
          <div class="banner-icon">⚔️</div>
          <div class="banner-body">
            <div class="banner-title">KoP Registration</div>
            <div class="banner-desc">Register your attack slots early to avoid clashes. Leaders will finalise assignments closer to the event.</div>
          </div>
          <div class="banner-arrow">→</div>
        </el-card>

        <el-card class="banner-card" shadow="hover" @click="nav.redirectTo('/ks/agreement')">
          <div class="banner-icon">📜</div>
          <div class="banner-body">
            <div class="banner-title">Server Agreement</div>
            <div class="banner-desc">United Coalition of 236 — building allocations, voting procedures, and event rules.</div>
          </div>
          <div class="banner-arrow">→</div>
        </el-card>
      </div>
    </section>

    <el-dialog v-model="showClosedDialog" width="360px" align-center>
      <div class="closed-dialog">
        <div class="closed-icon">🔒</div>
        <h3 class="closed-title">Registration Not Open</h3>
        <p class="closed-desc">The KoP registration period has not started yet. Check back closer to the next KvK event.</p>
        <el-button type="primary" style="width: 100%; margin-top: 8px;" @click="showClosedDialog = false">Got it</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 24px 16px 32px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 24px;
}

.kingdom-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--color-heading);
}

.kingdom-subtitle {
  color: var(--color-text);
  opacity: 0.6;
  margin-top: 6px;
  font-size: 0.95rem;
}

.kop-section {
  max-width: 900px;
  margin: 0 auto;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--color-heading);
}

.kop-info {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.info-item {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
}

.value {
  font-weight: 600;
  color: var(--color-heading);
}

.banners {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.banner-card {
  cursor: pointer;
  transition: border-color 0.15s;
}

.banner-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
}

.banner-icon {
  font-size: 1.6rem;
  flex-shrink: 0;
}

.banner-body {
  flex: 1;
}

.banner-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 3px;
}

.banner-desc {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.65;
  line-height: 1.45;
}

.banner-arrow {
  font-size: 1rem;
  color: var(--color-text);
  opacity: 0.4;
  flex-shrink: 0;
}

.closed-dialog {
  text-align: center;
  padding: 8px 4px 4px;
}

.closed-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.closed-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 8px;
}

.closed-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
  line-height: 1.55;
}

@media (min-width: 640px) {
  .kingdom-title {
    font-size: 2.4rem;
  }

  .kop-info {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
