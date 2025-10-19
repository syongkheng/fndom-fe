<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'
import { ElButton, ElIcon } from 'element-plus'

import ManageNoticeDialog from '@/components/dialogs/ManageNoticeDialog.vue'
import { useLayoutStateStore } from '@/stores/layoutState'
import { useNoticeManager } from '@/hooks/useNoticeManager'
import { useAuthenticationStore } from '@/stores/authentication'
import { useNav } from '@/hooks/useNav'
import type { FndManageNotice } from '@/interfaces/forms/FndManageNotice.model'
import { DateUtils } from '@/utilities/DateUtils'

defineProps({
  displayCardsOnly: {
    type: Boolean,
    default: false
  }
})

// Stores & hooks
const { userProfile } = useAuthenticationStore()
const layoutStore = useLayoutStateStore()
const noticeManager = useNoticeManager()
const navigate = useNav()

// State
const selectedNotice = ref<FndManageNotice | null>(null)

// Lifecycle
onMounted(async () => {
  await noticeManager.retrieveAllNotices()
})

// Handlers
const handleAddNotice = () => {
  selectedNotice.value = null
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

const handleSubmitNotice = (notice: FndManageNotice) => {
  if (selectedNotice.value) {
    noticeManager.updateNotice(notice, selectedNotice.value.id!)
  } else {
    noticeManager.createNotice(notice)
  }

  selectedNotice.value = null
  navigate.refreshPage()
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
    <div v-if="noticeManager.notices.value.length > 0">

      <div v-for="notice in noticeManager.notices.value" :key="notice.id" class="notice-card"
        :class="notice.type.toLowerCase()">
        <div class="header">
          <span class="badge-wrapper">
            <span class="badge">{{ notice.type }}</span>
            <span class="created-dt">{{ DateUtils.toDateTimeString(new Date(notice.created_dt!)) }}</span>
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
      </div>
    </div>
    <div v-else>
      <el-empty description="No notices yet" style="height: 250px;" />
    </div>

    <!-- Modal -->
    <ManageNoticeDialog :notice="selectedNotice || undefined" @submit="handleSubmitNotice" />
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
  height: 165px;
  overflow: auto;
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
