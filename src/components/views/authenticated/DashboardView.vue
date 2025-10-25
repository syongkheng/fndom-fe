<script setup lang="ts">
import { useAuthenticationStore } from '@/stores/authentication'
import EventCard from '@/components/cards/EventCard.vue'
import NoticeCard from '@/components/cards/NoticeCard.vue'
import { useNoticeManagerStore } from '@/stores/notice'
import ManageNoticeDialog from '@/components/dialogs/ManageNoticeDialog.vue'
import ManageEventDialog from '@/components/dialogs/ManageEventDialog.vue'
import { useEventManagerStore } from '@/stores/event'

const { userProfile } = useAuthenticationStore()
const noticeManager = useNoticeManagerStore()
const eventManager = useEventManagerStore()

</script>

<template>
  <main class="dashboard">
    <!-- Header Section -->
    <header class="dashboard-header">
      <h1 class="dashboard-title">Welcome back, {{ userProfile.username }} 👋</h1>
      <p class="dashboard-subtitle">Here are what you should know</p>
    </header>

    <!-- Content Section -->
    <section class="dashboard-content">
      <!-- Notices Section -->
      <div class="dashboard-section">
        <NoticeCard />
      </div>
      <!-- Events Section -->
      <div class="dashboard-section">
        <EventCard />
      </div>
    </section>

    <ManageNoticeDialog :notice="noticeManager.selectedNotice || undefined" :view-only="false" />
    <ManageEventDialog :event="eventManager.selectedEvent || undefined" />
  </main>
</template>

<style scoped>
/* Layout Base */
.dashboard {
  color: #2c2c2c;
  background: #f8f9fb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Header */
.dashboard-header {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dashboard-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.5px;
}

.dashboard-subtitle {
  font-size: 1rem;
  color: #6b7280;
}

/* Content Layout */
.dashboard-content {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 2rem;
}

.dashboard-section {
  flex: 1;
  background-color: #ffffff;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.dashboard-section:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  border-left: 4px solid var(--el-color-primary, #409eff);
  padding-left: 0.75rem;
  margin-bottom: 0.5rem;
}

/* Responsive Design */
@media (max-width: 1000px) {
  .dashboard-content {
    flex-direction: column;
  }
}
</style>
