<script setup lang="ts">
import { useNav } from '@/hooks/useNav';

const nav = useNav();

const handleTravelPlanningClick = () => {
  nav.redirectToTravel();
};


const handleHabitTrackingClick = () => {
  nav.redirectToHabit();
};

const handleFlatAnalysisClick = () => {
  nav.redirectToPphs();
};


</script>

<template>
  <main class="landing-container">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1>Workspace</h1>
        <p>Your virtual workspace for your daily life.</p>
        <!-- <button class="primary-btn">Start Your Journey</button> -->
      </div>
      <div class="hero-bg-icon"></div>
    </section>

    <!-- Features -->
    <section class="features">
      <h2>I want to work on</h2>
      <div class="feature-grid">
        <div class="feature-card">
          <h3>Travel Planning</h3>
          <p>I want to travel and have an organised overview of my trip.</p>
          <el-button type="primary" @click="handleTravelPlanningClick">Start Planning</el-button>
        </div>
        <div class="feature-card">
          <h3>Habit Tracking</h3>
          <p>Track your daily habits and build positive routines.</p>
          <el-button type="primary" @click="handleHabitTrackingClick">Start Tracking</el-button>
        </div>
        <div class="feature-card">
          <h3>Flat Analysis</h3>
          <p>Search what is within the vicinity of a location, including the recent PPHS exercise.</p>
          <el-button type="primary" @click="handleFlatAnalysisClick">Start Analysis</el-button>
        </div>
      </div>
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
  height: 200px;

  p {
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  button {
    display: none
  }
}

.feature-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);

  button {
    display: flex
  }
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
