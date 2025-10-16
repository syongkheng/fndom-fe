<script setup lang="ts">
import UtcClock from '@/components/clocks/UtcClock.vue'
import { useAuthenticationStore } from '@/stores/authentication'
import NoticeCard from '@/components/cards/NoticeCard.vue'
import { ElButton } from 'element-plus'
import type { FndManageNotice } from '@/interfaces/forms/FndManageNotice.model'
import ManageNoticeDialog from '@/components/dialogs/ManageNoticeDialog.vue'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useNoticeManager } from '@/hooks/useNoticeManager'
import { onMounted, ref } from 'vue'
import { useNav } from '@/hooks/useNav'

const { userProfile } = useAuthenticationStore()

const layoutStore = useLayoutStateStore();
const noticeManager = useNoticeManager();
const navigate = useNav();

const selectedNotice = ref<FndManageNotice | null>(null)

const handleSubmitNotice = (notice: FndManageNotice) => {
  if (selectedNotice.value) {
    // Update existing
    noticeManager.updateNotice(notice, selectedNotice.value.id!)
  } else {
    // Create new
    noticeManager.createNotice(notice)
  }

  selectedNotice.value = null
  navigate.refreshPage()
}


const handleAddNotice = () => {
  layoutStore.fndNoticeDialog.setTrue()
}

const handleEditNotice = (notice: FndManageNotice) => {
  selectedNotice.value = notice
  layoutStore.fndNoticeDialog.setTrue()
}


const handleDeleteNotice = (notice: FndManageNotice) => {
  noticeManager.deleteNotice(notice)
  navigate.refreshPage()
}

const handleAddEvent = () => {
  console.log('Add new event clicked!')
}

onMounted(async () => {
  noticeManager.retrieveAllNotices()
})
</script>

<template>
  <main>
    <div class="intro">
      <h1>{{ userProfile.username }}</h1>
    </div>

    <div class="clock">
      <UtcClock />
    </div>

    <div class="notices-and-events">
      <!-- Events Section -->
      <div class="events">
        <div class="notice-header">
          <h2>Events</h2>
          <el-button v-if="userProfile.role === 'R4'" type="primary" size="small" @click="handleAddEvent">
            + Add Event
          </el-button>
        </div>
      </div>

      <!-- Notices Section -->
      <div class="notices">
        <div class="notice-header">
          <h2>Notices</h2>
          <el-button v-if="userProfile.role === 'R4'" type="primary" size="small" @click="handleAddNotice">
            + Add Notice
          </el-button>
        </div>

        <NoticeCard v-for="notice in noticeManager.notices.value" :key="notice.id" :type="notice.type"
          :title="notice.title" :content="notice.content" :created-by="notice.created_by" :date="notice.created_dt!"
          @edit="handleEditNotice(notice)" @delete="handleDeleteNotice(notice)" />
      </div>
    </div>

    <!-- Modal -->
    <ManageNoticeDialog :notice="selectedNotice || undefined" @submit="handleSubmitNotice" />
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

.clock {
  margin-bottom: 1.5rem;
}

/* --- Layout Container --- */
.notices-and-events {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 1.5rem;
}

/* Each Section */
.notices,
.events {
  flex: 1;
  background-color: #fafafa;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* Header Row for both Notices and Events */
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

/* --- Responsive --- */
@media (max-width: 1000px) {
  .notices-and-events {
    flex-direction: column;
  }
}
</style>
