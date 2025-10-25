<script setup lang="ts">
import NoticeCard from '@/components/cards/NoticeCard.vue';
// import { Bell } from '@element-plus/icons-vue'
// import { useNav } from '@/hooks/useNav';
import ManageNoticeDialog from '@/components/dialogs/ManageNoticeDialog.vue'
import { useNoticeManagerStore } from '@/stores/notice';

const noticeManager = useNoticeManagerStore();

// const { redirectToSchedule } = useNav();


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
    <!-- <div class="events">
      <h2>View Upcoming Events</h2>
      <div>
        <span>Checkout upcoming battles, events!</span>
      </div>
      <div>
        <el-button type="primary" :icon="Bell" @click="redirectToSchedule">{{ "View Schedule" }}</el-button>
      </div>
    </div> -->
  </main>
  <ManageNoticeDialog :notice="noticeManager.selectedNotice || undefined" :view-only="true" />

</template>

<style scoped>
main {
  gap: 1rem;
  max-width: 100svw;
  color: #333333;
}

.announcements {
  margin-top: 1rem;
  width: 50%;
  color: #333333;

  @media (max-width: 768px) {
    width: 100%;
  }
}

.events {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
