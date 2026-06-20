<script setup lang="ts">
defineProps<{ name: string; size?: number; stroke?: number }>()
</script>

<template>
  <svg
    :width="size ?? 16"
    :height="size ?? 16"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="'currentColor'"
    :stroke-width="stroke ?? 1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    style="flex-shrink:0;display:inline-block;vertical-align:middle"
  >
    <!-- bolt -->
    <polyline v-if="name==='bolt'" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    <!-- target / crosshair -->
    <template v-else-if="name==='target'">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </template>
    <!-- run (running figure) -->
    <template v-else-if="name==='run'">
      <circle cx="13" cy="4" r="1.5"/>
      <path d="M6 17l2-4 3 3 3-5 2 2 2-5"/>
    </template>
    <!-- pin / map-pin -->
    <template v-else-if="name==='pin'">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </template>
    <!-- check -->
    <polyline v-else-if="name==='check'" points="20 6 9 17 4 12" />
    <!-- plus -->
    <template v-else-if="name==='plus'">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </template>
    <!-- star -->
    <polygon v-else-if="name==='star'" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    <!-- medal -->
    <template v-else-if="name==='medal'">
      <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
    </template>
    <!-- lock -->
    <template v-else-if="name==='lock'">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </template>
    <!-- flame -->
    <path v-else-if="name==='flame'" d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    <!-- info -->
    <template v-else-if="name==='info'">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </template>
    <!-- edit / pencil -->
    <template v-else-if="name==='edit'">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </template>
    <!-- cal / calendar -->
    <template v-else-if="name==='cal'">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </template>
    <!-- bell -->
    <template v-else-if="name==='bell'">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </template>
    <!-- weight / scales -->
    <template v-else-if="name==='weight'">
      <circle cx="12" cy="5" r="3"/><path d="M6.5 8h11l1 13H5.5z"/>
    </template>
    <!-- share -->
    <template v-else-if="name==='share'">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </template>
    <!-- arrUp (arrow up) -->
    <template v-else-if="name==='arrUp'">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </template>
    <!-- arr (arrow right) -->
    <template v-else-if="name==='arr'">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </template>
    <!-- play -->
    <polygon v-else-if="name==='play'" points="5 3 19 12 5 21 5 3" />
    <!-- chevL (chevron left) -->
    <polyline v-else-if="name==='chevL'" points="15 18 9 12 15 6" />
    <!-- chev (chevron right) -->
    <polyline v-else-if="name==='chev'" points="9 18 15 12 9 6" />
    <!-- chevDown -->
    <polyline v-else-if="name==='chevDown'" points="6 9 12 15 18 9" />
    <!-- search -->
    <template v-else-if="name==='search'">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </template>
    <!-- home -->
    <template v-else-if="name==='home'">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </template>
    <!-- list -->
    <template v-else-if="name==='list'">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </template>
    <!-- calculator / chart-bar -->
    <template v-else-if="name==='calculator'">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </template>
    <!-- user -->
    <template v-else-if="name==='user'">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </template>
    <!-- trophy -->
    <template v-else-if="name==='trophy'">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </template>
  </svg>
</template>
