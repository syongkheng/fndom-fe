<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 🕒 Reactive UTC time
const utcTime = ref<string>('')

// Function to update UTC time every second
const updateUtcTime = () => {
  const now = new Date()
  utcTime.value = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
}

let timer: ReturnType<typeof setInterval>

onMounted(() => {
  updateUtcTime()
  timer = setInterval(updateUtcTime, 1000)
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="utc-clock">
    <strong>{{ utcTime }}</strong>
  </div>
</template>

<style scoped>
.utc-clock {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
  color: #333;
  font-family: monospace;
}
</style>
