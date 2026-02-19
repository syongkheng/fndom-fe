<script setup lang="ts">
import { useNav } from '@/hooks/useNav';

const nav = useNav();

const handleRegisterNow = () => {
  nav.redirectTo("/ks/kop")
}
</script>

<template>
  <div class="page-container">
    <!-- Hero Section -->
    <section class="hero">
      <h1 class="kingdom-title">Kingdom 236</h1>
      <p class="kingdom-subtitle">"If everyone is moving forward together, then success takes care of itself." — Henry
        Ford</p>
    </section>

    <!-- KoP Section -->
    <section class="kop-section">
      <h2 class="section-title">Kingdom of Power Preparation</h2>

      <div class="kop-info">
        <div class="info-item">
          <span class="label">Preparation Week</span>
          <span class="value">23 Feb - 28 Feb</span>
        </div>
        <div class="info-item">
          <span class="label">KvK Castle Battle</span>
          <span class="value">28 Feb</span>
        </div>
      </div>

      <el-card class="announcement-card" shadow="hover">
        <template #header>
          📢 Kingdom Announcement
        </template>

        <p style="margin-bottom: 1rem;">
          Please register your KoP attack slots early to avoid clashes.
          Leaders will finalize assignments closer to the event.
        </p>

        <el-button type="primary" @click="handleRegisterNow">Register Now</el-button>
      </el-card>
    </section>
  </div>
</template>

<style scoped>
/* Hero */
.hero {
  text-align: center;
  padding: 24px 16px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 24px;
}

.kingdom-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.kingdom-subtitle {
  color: #9ca3af;
  margin-top: 6px;
  font-size: 0.95rem;
}

/* Section */
.kop-section {
  max-width: 900px;
  margin: 0 auto;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 16px;
}

/* Info row */
.kop-info {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.info-item {
  background: #020617;
  border: 1px solid #1f2933;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 0.85rem;
  color: #9ca3af;
}

.value {
  font-weight: 600;
  color: #e5e7eb;
}

/* Card */
.announcement-card {
  border-radius: 12px;
  border: 1px solid #1f2933;
  background: #020617;
  color: #e5e7eb;
}

.announcement-card p {
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Tablet and above */
@media (min-width: 640px) {
  .kingdom-title {
    font-size: 2.4rem;
  }

  .kop-info {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
