<script setup lang="ts">
import { computed } from "vue";
import { useAuthenticationStore } from "@/stores/authentication";

const props = defineProps<{
  roles: string[];
}>();

const authStore = useAuthenticationStore();

const hasRole = computed(() => {
  const userRoles = authStore.userProfile?.role ?? [];
  return props.roles.some(role => userRoles.includes(role)) && !authStore.turnOffAdminFeatures;
});
</script>

<template>
  <slot v-if="hasRole"></slot>
</template>
