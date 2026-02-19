<script setup lang="ts">
import { onMounted } from 'vue'
import { Edit, Delete, View } from '@element-plus/icons-vue'
import { ElButton } from 'element-plus'

import { useLayoutStateStore } from '@/stores/layoutState'
import { useNoticeManagerStore } from '@/stores/notice'
import { useAuthenticationStore } from '@/stores/authentication'
import { useNav } from '@/hooks/useNav'
import type { FndManageNotice } from '@/interfaces/forms/FndManageNotice.model'
import IconWithText from '../icons/IconWithText.vue'

defineProps({
  displayCardsOnly: {
    type: Boolean,
    default: false
  },
})

// Stores & hooks
const { userProfile } = useAuthenticationStore()
const layoutStore = useLayoutStateStore()
const noticeManager = useNoticeManagerStore()
const navigate = useNav()

// Lifecycle
onMounted(async () => {
  await noticeManager.retrieveAllNotices()
})

// Handlers
const handleAddNotice = () => {
  noticeManager.selectedNotice = null
  noticeManager.viewOnly = false
  layoutStore.fndManageNoticeDialog.setTrue()
}

const handleEditNotice = (notice: FndManageNotice) => {
  noticeManager.selectedNotice = { ...notice }
  noticeManager.viewOnly = false
  layoutStore.fndManageNoticeDialog.setTrue()
}

const handleDeleteNotice = (notice: FndManageNotice) => {
  noticeManager.deleteNotice(notice)
  navigate.refreshPage()
}

const handleViewNotice = (notice: FndManageNotice) => {
  noticeManager.selectedNotice = { ...notice }
  noticeManager.viewOnly = true
  layoutStore.fndManageNoticeDialog.setTrue()
  noticeManager.viewNotice(notice.id!)
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="notice-header" v-if="!displayCardsOnly">
      <h2>Notices</h2>
      <el-button v-if="userProfile.role === 'R4'" type="primary" size="small" @click="handleAddNotice">
        + Add Notice
      </el-button>
    </div>

    <!-- Notices List -->
    <div v-if="noticeManager.notices.length > 0">
      <div v-for="notice in noticeManager.notices" :key="notice.id" class="notice-card"
        :class="notice.type.toLowerCase()">
        <div class="header">
          <div class="badge-wrapper">
            <span class="badge">{{ notice.type }}</span>
            <div class="created-info">
              <div>Posted on: {{ new Date(notice.created_dt!).toUTCString().replace('GMT', 'UTC') }}</div>
              <div>Posted by: {{ notice.created_by || 'UNKNOWN' }}</div>
            </div>
          </div>
        </div>

        <div class="body">
          <h3>{{ notice.title }}</h3>
          <p>{{ notice.content }}</p>
        </div>

        <div class="footer">
          <IconWithText :icon="View" :label="`Views: ${notice.view_count}`"
            :onClickHandler="() => handleViewNotice(notice)" label-position="right" />
          <div class="actions" v-if="userProfile.role === 'R4'">
            <IconWithText :icon="Edit" label="Edit" :onClickHandler="() => handleEditNotice(notice)"
              label-position="right" />
            <IconWithText :icon="Delete" label="Delete" :onClickHandler="() => handleDeleteNotice(notice)"
              label-position="right" />
          </div>
        </div>
      </div>
    </div>

    <el-empty v-else description="No notices yet" style="height: 250px;" />
  </div>
</template>

<style scoped>
.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.notice-card {
  background: #fff;
  border: 1px solid #ddd;
  border-left: 5px solid #bbb;
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
  margin: 1rem 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.notice-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.badge {
  font-size: 0.8rem;
  font-weight: bold;
  padding: 0.2rem 0.6rem;
  border-radius: 5px;
  text-transform: uppercase;
  color: #fff;
}

.created-info {
  font-size: 0.7rem;
  color: #666;
}

.body h3 {
  font-size: 1.1rem;
  margin-bottom: 0.3rem;
}

.body p {
  font-size: 0.9rem;
  color: #444;
  line-height: 1.4;
  max-height: 75px;
  overflow: auto;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
}

.actions {
  display: flex;
  gap: 1rem;
}

/* Type Styles */
.notice-card.notice {
  border-left-color: #007bff;
}

.notice-card.notice .badge {
  background-color: #007bff;
}

.notice-card.poll {
  border-left-color: #ffb100;
}

.notice-card.poll .badge {
  background-color: #ffb100;
}
</style>
