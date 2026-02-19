<script setup lang="ts">
import { onMounted } from 'vue'
import { Edit, Delete, View } from '@element-plus/icons-vue'
import { ElButton, ElIcon, ElEmpty } from 'element-plus'

import { useLayoutStateStore } from '@/stores/layoutState'
import { useEventManagerStore } from '@/stores/event'
import { useAuthenticationStore } from '@/stores/authentication'
import { useNav } from '@/hooks/useNav'
import type { FndManageEvent } from '@/interfaces/forms/FndManageEvent.model'


defineProps({
  displayCardsOnly: {
    type: Boolean,
    default: false
  }
})

// Stores & hooks
const { userProfile } = useAuthenticationStore()
const layoutStore = useLayoutStateStore()
const eventManager = useEventManagerStore()
const navigate = useNav()

// Lifecycle
onMounted(async () => {
  await eventManager.retrieveAllEvents()
})

// Handlers
const handleAddEvent = () => {
  eventManager.selectedEvent = null
  eventManager.viewOnly = false
  layoutStore.fndEventDialog.setTrue()
}

const handleEditEvent = (event: FndManageEvent) => {
  eventManager.selectedEvent = event
  eventManager.viewOnly = false
  layoutStore.fndEventDialog.setTrue()
}

const handleDeleteEvent = async (event: FndManageEvent) => {
  await eventManager.deleteEvent(event)
  navigate.refreshPage()
}

const handleViewNotice = async (event: FndManageEvent) => {
  eventManager.selectedEvent = { ...event }
  eventManager.viewOnly = true
  layoutStore.fndEventDialog.setTrue()
  await eventManager.viewEvent(event.id!)
}
</script>

<template>
  <div class="event-section">
    <!-- Header -->
    <div class="event-header" v-if="displayCardsOnly === false">
      <h2>Events</h2>
      <el-button v-if="userProfile.role === 'R4'" type="primary" size="small" @click="handleAddEvent">
        + Add Event
      </el-button>
    </div>

    <!-- Event Timeline -->
    <div v-if="eventManager.events.length > 0" class="event-timeline">
      <div v-for="(event, index) in eventManager.events" :key="event.id" class="event-card">
        <!-- Timeline Dot -->
        <div class="timeline-dot"></div>
        <!-- Connecting Line -->
        <div v-if="index < eventManager.events.length - 1" class="timeline-line"></div>

        <div class="content">
          <div class="header">
            <div class="datetime">
              {{ new Date(event.event_dt * 1000).toUTCString().replace('GMT', 'UTC') }}
            </div>

            <div class="actions" v-if="userProfile.role === 'R4'">
              <el-icon class="icon edit" @click="handleEditEvent(event)">
                <Edit />
              </el-icon>
              <el-icon class="icon delete" @click="handleDeleteEvent(event)">
                <Delete />
              </el-icon>
            </div>
          </div>

          <div class="body">
            <h3>{{ event.title }}</h3>
            <p class="description">{{ event.content }}</p>
          </div>

          <div class="footer">
            <span class="created-by">
              Created by {{ event.created_by || 'UNKNOWN' }}
            </span>
            <div class="view-section" @click="handleViewNotice(event)">
              <el-icon class="icon view">
                <View />
              </el-icon>
              <span class="view-count">{{ event.view_count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else>
      <el-empty description="No events yet" style="height: 250px;" />
    </div>

  </div>
</template>

<style scoped>
.event-section {
  flex: 1;
  background-color: #fafafa;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* Header */
.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

/* Timeline Container */
.event-timeline {
  position: relative;
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-left: 2.5rem;
}

/* Each Event Card */
.event-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Timeline Dot */
.timeline-dot {
  position: absolute;
  left: 0.1rem;
  top: 1rem;
  width: 14px;
  height: 14px;
  background-color: #409eff;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 2px #409eff33;
  z-index: 2;
}

/* Connecting Line */
.timeline-line {
  position: absolute;
  left: 0.5rem;
  top: 2rem;
  width: 2px;
  height: calc(100% + 1.5rem);
  background-color: #ddd;
  z-index: 1;
}

/* Content Box */
.content {
  background: #fff;
  border-radius: 10px;
  padding: 1rem 1.2rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
  border: 1px solid #eee;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.content:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

/* Header Row */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Date & Time */
.datetime {
  font-size: 0.85rem;
  color: #777;
  margin-top: 0.3rem;
}

/* Body */
.body h3 {
  font-size: 1.1rem;
  margin-bottom: 0.3rem;
}

.body .description {
  font-size: 0.9rem;
  color: #444;
  line-height: 1.4;
}

/* Footer */
.footer {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #888;
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

/* Action Icons */
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
  color: #409eff;
}

.icon.delete:hover {
  color: #f56c6c;
}

/* Responsive */
@media (max-width: 768px) {
  .event-timeline {
    padding-left: 2rem;
  }

  .content {
    padding: 0.8rem 1rem;
  }
}
</style>
