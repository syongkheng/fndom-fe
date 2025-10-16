<script setup lang="ts">
import NoticeCard from '@/components/cards/NoticeCard.vue';
import { useNav } from '@/hooks/useNav';
import { useNoticeManager } from '@/hooks/useNoticeManager';
import { Bell } from '@element-plus/icons-vue'
import { onMounted } from 'vue';

const { redirectToSchedule } = useNav();

const noticeManager = useNoticeManager();

onMounted(async () => {
  noticeManager.retrieveAllNotices()
})
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

        <NoticeCard v-for="notice in noticeManager.notices.value" :key="notice.id" :type="notice.type"
          :title="notice.title" :content="notice.content" :date="notice.created_dt!" :created-by="notice.created_by"
          :editable="false" :deletable="false" />
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
  width: 90%;
  color: #333333;
}

.events {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
