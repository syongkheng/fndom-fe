<script setup lang="ts">
import HomeStageAccordion from '../accordions/HomeStageAccordion.vue';


</script>

<template>
  <main>
    <div class="intro">
      <h1>Adulting</h1>
      <p>Virtual adulting companion to help you navigate life in Singapore.</p>
    </div>
    <div class="features">
      <h2>
        How can we help?
      </h2>
      <div>
        <HomeStageAccordion />
      </div>
    </div>
  </main>
</template>

<style scoped>
main {
  gap: 1rem;
  max-width: 100svw;
  color: #333333;
}

.features {
  width: 50%;
  color: #333333;

  @media (max-width: 768px) {
    width: 100%;
  }
}

.events {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
