<script setup lang="ts">
import { Edit, Delete } from '@element-plus/icons-vue'

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void
}>()

defineProps<{
  type: string
  title: string
  content: string
  date: number
  createdBy?: string
  editable?: boolean
  deletable?: boolean
}>()
</script>

<template>
  <div class="notice-card" :class="type.toLowerCase()">
    <div class="header">
      <span class="badge">{{ type }}</span>

      <div class="actions">
        <el-icon v-if="editable" class="icon edit" @click="emit('edit')">
          <Edit />
        </el-icon>
        <el-icon v-if="deletable" class="icon delete" @click="emit('delete')">
          <Delete />
        </el-icon>
      </div>
    </div>

    <div class="audit">
      <span>{{ date }}</span>
      <span>{{ createdBy || 'UNKNOWN' }}</span>
    </div>

    <div class="body">
      <h3>{{ title }}</h3>
      <p>{{ content }}</p>
    </div>
  </div>
</template>

<style scoped>
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

.badge {
  font-size: 0.8rem;
  font-weight: bold;
  padding: 0.2rem 0.6rem;
  border-radius: 5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  /* Element Plus primary color */
}

.icon.delete:hover {
  color: #F56C6C;
  /* Danger color */
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
