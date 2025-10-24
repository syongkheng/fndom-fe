<script setup lang="ts">
import { onMounted } from 'vue'
import { Edit, Delete, View } from '@element-plus/icons-vue'
import { ElButton, ElIcon } from 'element-plus'

import { useLayoutStateStore } from '@/stores/layoutState'
import { useNoticeManagerStore } from '@/stores/notice'
import { useAuthenticationStore } from '@/stores/authentication'
import { useNav } from '@/hooks/useNav'
import type { FndManageNotice } from '@/interfaces/forms/FndManageNotice.model'

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
  <div class="notice-section">
    <!-- Header -->
    <div class="notice-header" v-if="displayCardsOnly === false">
      <h2>Notices</h2>
      <el-button v-if="userProfile.role === 'R4'" type="primary" size="small" @click="handleAddNotice">
        + Add Notice
      </el-button>
    </div>

    <!-- List of Notices -->
    <div v-if="noticeManager.notices.length > 0">

      <div v-for="notice in noticeManager.notices" :key="notice.id" class="notice-card"
        :class="notice.type.toLowerCase()">
        <div class="header">
          <span class="badge-wrapper">
            <span class="badge">{{ notice.type }}</span>
            <span class="created-dt">{{ new Date(notice.created_dt!).toUTCString().replace("GMT", "UTC") }}</span>
          </span>

          <div class="actions">
            <el-icon v-if="userProfile.role === 'R4'" class="icon edit" @click="handleEditNotice(notice)">
              <Edit />
            </el-icon>
            <el-icon v-if="userProfile.role === 'R4'" class="icon delete" @click="handleDeleteNotice(notice)">
              <Delete />
            </el-icon>
          </div>
        </div>

        <div class="audit">
          <span>{{ notice.created_by || 'UNKNOWN' }}</span>
        </div>

        <div class="body">
          <h3>{{ notice.title }}</h3>
          <p>{{ notice.content }}</p>
        </div>

        <!-- View count section -->
        <div class="view-section" @click="handleViewNotice(notice)">
          <el-icon class="icon view">
            <View />
          </el-icon>
          <span class="view-count">{{ notice.view_count }}</span>
        </div>
      </div>
    </div>
    <div v-else>
      <el-empty description="No notices yet" style="height: 250px;" />
    </div>

  </div>
</template>

<style scoped>
.notice-section {
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

.notice-card {
  background: #fff;
  border: 1px solid #ddd;
  border-left: 5px solid #bbb;
  border-radius: 10px;
  padding: 1rem 1.2rem;
  margin: 1rem 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: auto;
  position: relative;
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
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}

.badge {
  font-size: 0.8rem;
  font-weight: bold;
  padding: 0.2rem 0.6rem;
  border-radius: 5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.created-dt {
  font-size: 0.7rem;
}

.audit {
  display: flex;
  flex-direction: column;
  font-size: 0.7rem;
  color: #777;
  margin-top: 0.3rem;
}

.body h3 {
  font-size: 1.1rem;
  margin-bottom: 0.3rem;
}

.body p {
  font-size: 0.9rem;
  color: #444;
  line-height: 1.4;
}

.view-section {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  margin-top: 0.5rem;
}

.view-section .icon.view {
  color: #888;
}

.view-section:hover .icon.view {
  color: #409EFF;
}

.view-count {
  font-size: 0.85rem;
  color: #555;
}

/* --- Icon Actions --- */
.actions {
  display: flex;
  gap: 0.4rem;
}

.icon {
  cursor: pointer;
  font-size: 1rem;
  color: #666;
  transition: color 0.2s;
}

.icon:hover {
  color: #000;
}

.icon.edit:hover {
  color: #409EFF;
}

.icon.delete:hover {
  color: #F56C6C;
}

/* Type Styles */
.notice-card.notice {
  border-left-color: #007bff;
}

.notice-card.notice .badge {
  background-color: #007bff;
  color: white;
}

.notice-card.poll {
  border-left-color: #ffb100;
}

.notice-card.poll .badge {
  background-color: #ffb100;
  color: white;
}
</style>
