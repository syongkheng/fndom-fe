<script lang="ts" setup>
defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  loadingText: {
    type: String,
    required: true,
    default: "Loading"
  }
})

</script>

<template>
  <el-dialog :model-value="isOpen" align-center>
    <div class="form-wrapper">
      {{ loadingText }}
    </div>
  </el-dialog>
</template>

<style scoped></style>
