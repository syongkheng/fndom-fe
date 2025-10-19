<script setup lang="ts">
import NoticeCard from '@/components/cards/NoticeCard.vue';
import { useNav } from '@/hooks/useNav';
import { Bell } from '@element-plus/icons-vue'

const { redirectToSchedule } = useNav();

</script>

<template>
  <main>
    <div class="intro">
      <h1>Finderium</h1>
      <p>An alliance from Kingshot's server 236.</p>
    </div>
    <div class="announcements">
      <h2>Announcements</h2>
      <div>
        <NoticeCard :display-cards-only="true" />
      </div>
    </div>
    <div class="events">
      <h2>View Upcoming Events</h2>
      <div>
        <span>Checkout upcoming battles, events!</span>
      </div>
      <div>
        <el-button type="primary" :icon="Bell" @click="redirectToSchedule">{{ "View Schedule" }}</el-button>
      </div>
    </div>
  </main>
</template>

<style scoped>
main {
  gap: 1rem;
  max-width: 100svw;
  color: #333333;
}

.announcements {
  width: 50%;
  color: #333333;
}

.events {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
