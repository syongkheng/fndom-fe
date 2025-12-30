<script setup lang="ts">
import { ref } from "vue";
const testInput = ref<string>("")
</script>

<template>
  <div>Debug View</div>
  <section>
    <el-input v-model="testInput" placeholder="Type something to test..." />
    <p>You typed: {{ testInput }}</p>
  </section>
</template>

<style lang="css" scoped></style>
