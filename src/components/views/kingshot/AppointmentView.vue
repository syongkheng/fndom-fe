<script setup lang="ts">
import AppBreadcrumb from '@/components/common/AppBreadcrumb.vue'
</script>

<template>
  <div class="page-container">
    <AppBreadcrumb :crumbs="[{ label: 'Kingshot', path: '/ks' }, { label: 'KoP Registration', path: '/ks/kop' }, { label: 'Appointment' }]" />
    <div>These are the responses. None of the following have been confirmed.</div>
    <hr />
  </div>
</template>

<style></style>
