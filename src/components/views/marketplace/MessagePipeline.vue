<script setup lang="ts">
defineProps<{
  providerColor: string
  providerName:  string
}>()
</script>

<template>
  <div class="pipeline">

    <!-- Node: You -->
    <div class="p-node">
      <div class="p-dot p-dot--you" />
      <span class="p-label">You</span>
    </div>

    <!-- Segment 1: You → Awense -->
    <div class="p-seg">
      <div class="p-track" />
      <div class="p-packet p-packet--1" />
    </div>

    <!-- Node: Awense -->
    <div class="p-node">
      <div class="p-dot p-dot--server" />
      <span class="p-label">Awense</span>
    </div>

    <!-- Segment 2: Awense → Provider -->
    <div class="p-seg">
      <div class="p-track" />
      <div class="p-packet p-packet--2" :style="{ background: providerColor, boxShadow: `0 0 6px 2px ${providerColor}55` }" />
    </div>

    <!-- Node: Provider -->
    <div class="p-node">
      <div class="p-dot p-dot--provider" :style="{ '--pc': providerColor }" />
      <span class="p-label">{{ providerName }}</span>
    </div>

    <!-- Waiting dots (looping after provider node activates) -->
    <div class="p-waiting">
      <span class="w-dot" />
      <span class="w-dot" />
      <span class="w-dot" />
    </div>

  </div>
</template>

<style scoped>
/* ── Container ────────────────────────────────────────────── */
.pipeline {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  max-width: 480px;
  padding: 4px 0;
}

/* ── Nodes ────────────────────────────────────────────────── */
.p-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.p-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-border);
  opacity: 0.25;
  transition: opacity 0.2s, box-shadow 0.2s;
}

/* "You" node: immediately active */
.p-dot--you {
  background: var(--color-text);
  animation: dot-on 0.25s ease forwards;
  animation-delay: 0ms;
}

/* Awense node: activates when packet arrives (~350ms) */
.p-dot--server {
  background: var(--el-color-primary);
  animation: dot-on 0.25s ease forwards;
  animation-delay: 350ms;
}

/* Provider node: activates when packet arrives (~700ms) */
.p-dot--provider {
  background: var(--pc, #888);
  animation: dot-on-glow 0.3s ease forwards;
  animation-delay: 700ms;
}

@keyframes dot-on {
  from { opacity: 0.2; transform: scale(0.75); }
  to   { opacity: 1;   transform: scale(1);    }
}

@keyframes dot-on-glow {
  from { opacity: 0.2; transform: scale(0.75); box-shadow: none; }
  to   { opacity: 1;   transform: scale(1.15); box-shadow: 0 0 7px 2px var(--pc, #888); }
}

.p-label {
  font-size: 0.58rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--color-text);
  opacity: 0.35;
  white-space: nowrap;
  user-select: none;
}

/* ── Segments ─────────────────────────────────────────────── */
.p-seg {
  flex: 1;
  position: relative;
  height: 22px; /* enough vertical room for the packet */
  min-width: 36px;
}

.p-track {
  position: absolute;
  top: 37%;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-border);
}

.p-packet {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  top: 37%;
  transform: translateY(-50%);
  background: var(--el-color-primary);
  box-shadow: 0 0 6px 2px color-mix(in srgb, var(--el-color-primary) 50%, transparent);
  animation: packet-travel 320ms ease-in both;
}

.p-packet--1 { animation-delay: 20ms; }
.p-packet--2 { animation-delay: 370ms; }

@keyframes packet-travel {
  0%   { left: -4px;              opacity: 0; }
  8%   { opacity: 1;                          }
  92%  { opacity: 1;                          }
  100% { left: calc(100% + 4px);  opacity: 0; }
}

/* ── Waiting dots ─────────────────────────────────────────── */
.p-waiting {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 4px 0 8px;
  align-self: flex-start;  /* sit at dot level, not label level */
  margin-top: 0;
  flex-shrink: 0;
  /* shift up to align with dots rather than labels */
  transform: translateY(-6px);
}

.w-dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-text);
  animation: w-bounce 1.1s infinite ease-in-out backwards;
}

/* Start dots bouncing after the provider node activates */
.w-dot:nth-child(1) { animation-delay: 0.72s; }
.w-dot:nth-child(2) { animation-delay: 0.90s; }
.w-dot:nth-child(3) { animation-delay: 1.08s; }

@keyframes w-bounce {
  0%       { transform: translateY(0);    opacity: 0;    }
  5%       { opacity: 0.35;                              }
  30%      { transform: translateY(-4px); opacity: 0.75; }
  60%, 100% { transform: translateY(0);   opacity: 0.35; }
}
</style>
