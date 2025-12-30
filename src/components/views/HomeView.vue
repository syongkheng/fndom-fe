<script setup lang="ts">
import HomeStageAccordion from "../accordions/HomeStageAccordion.vue";
</script>

<template>
  <main class="landing-container">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1>Adult with Confidence</h1>
        <p>Your virtual companion for navigating HDB, PPHS, and life in Singapore.</p>
        <button class="primary-btn">Start Your Journey</button>
      </div>
      <div class="hero-bg-icon"></div>
    </section>

    <!-- Features -->
    <section class="features">
      <h2>How Awense Helps</h2>
      <div class="feature-grid">
        <div class="feature-card">
          <h3>Housing Basics</h3>
          <p>Understand HDB types, grants, timelines, and eligibility.</p>
        </div>
        <div class="feature-card">
          <h3>PPHS Navigation</h3>
          <p>Learn the process, availability, and whether you qualify.</p>
        </div>
        <div class="feature-card">
          <h3>Financial Planning</h3>
          <p>Estimate costs, compare scenarios, and avoid surprises.</p>
        </div>
        <div class="feature-card">
          <h3>Milestones & Guides</h3>
          <p>Step-by-step breakdowns of what to do next.</p>
        </div>
      </div>
    </section>

    <!-- Adulting Stages Accordion -->
    <section class="accordion-section">
      <h2>Adulting Stages</h2>
      <p class="accordion-subtitle">From PPHS to buying a home — understand each step clearly.</p>
      <HomeStageAccordion />
    </section>

    <!-- CTA -->
    <section class="cta">
      <h2>Ready to take the next step?</h2>
      <button class="primary-btn">Start Exploring</button>
    </section>
  </main>
</template>

<style scoped>
.hero-bg-icon {
  position: absolute;
  inset: 0;
  /* fills the hero */
  background-image: url('/src/assets/sg-map-backdrop.png');
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;

  opacity: 0.15;
  /* subtle background */
  z-index: 0;
  pointer-events: none;
  scale: 1.5;
}

.landing-container {
  display: flex;
  flex-direction: column;
  gap: 4rem;
  padding: 2rem;
  max-width: 1200px;
  margin: auto;
  color: #333;
}

/* Hero */
.hero {
  margin-top: 1rem;
  position: relative;
  padding: 4rem 1rem;
  text-align: center;
}

.hero-content h1 {
  font-size: 3rem;
  font-weight: 600;
}

.hero-content p {
  font-size: 1.2rem;
  color: #555;
  margin: 1rem 0 2rem;
  max-width: 600px;
  margin-inline: auto;
}

.primary-btn {
  background: #111;
  color: white;
  border: none;
  padding: 0.9rem 2rem;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s ease;
}

.primary-btn:hover {
  background: #333;
}

/* Features */
.features {
  text-align: center;
}

.feature-grid {
  margin-top: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  padding: 1.5rem;
  border: 1px solid #eee;
  border-radius: 12px;
  text-align: left;
  background: white;
  transition: box-shadow 0.2s ease;
}

.feature-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.feature-card h3 {
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
}

/* Accordion */
.accordion-section {
  text-align: center;
}

.accordion-subtitle {
  color: #555;
  margin-bottom: 1.5rem;
}

/* CTA */
.cta {
  text-align: center;
  padding: 2rem 0 4rem;
}

@media (max-width: 768px) {
  .hero-content h1 {
    font-size: 2.2rem;
  }

  .landing-container {
    padding: 1rem;
  }
}
</style>
