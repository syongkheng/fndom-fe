<script setup lang="ts">
import { useAuthenticationStore } from '@/stores/authentication'
import EventCard from '@/components/cards/EventCard.vue'
import NoticeCard from '@/components/cards/NoticeCard.vue'

const { userProfile } = useAuthenticationStore()

</script>

<template>
  <main>
    <p>{{ "Dashboard" }}</p>
    <div class="intro">
      <h1>{{ userProfile.username }}</h1>
    </div>

    <div class="notices-and-events">
      <!-- Events Section -->
      <EventCard />
      <!-- Notices Section -->
      <NoticeCard />
    </div>
  </main>
</template>

<style scoped>
main {
  color: #333;
  padding: 1rem;
}

.intro {
  margin-bottom: 1rem;
}


.notices-and-events {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 1.5rem;
}

.events {
  flex: 1;
  background-color: #fafafa;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.notice-header h2 {
  font-size: 1.2rem;
  margin: 0;
}

@media (max-width: 1000px) {
  .notices-and-events {
    flex-direction: column;
  }
}
</style>
