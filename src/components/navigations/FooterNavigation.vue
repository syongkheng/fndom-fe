<script lang="ts" setup>
import { Breakpoint } from '@/constants/Breakpoint'
import { useBreakpointManager } from '@/hooks/useBreakpointManager'
import { useNav } from '@/hooks/useNav'

const { redirectTo } = useNav()
const { isScreensizeBelow } = useBreakpointManager()

const flexFooterNavLinksColumn = isScreensizeBelow(Breakpoint.S)
</script>

<template>
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-brand">
        <img src="../../../public/icon-dark.png" alt="Finderium Logo" width="50" />
        <span class="brand-name">Finderium</span>
      </div>

      <div class="footer-links" :class="{ column: flexFooterNavLinksColumn }">
        <el-link type="primary" @click="redirectTo('/')">Home</el-link>
        <el-link type="primary" href="https://discord.gg/erGgT42W" target="_blank" rel="noopener noreferrer">
          Discord
        </el-link>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
  padding: 1rem 2rem;
  color: #333;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-name {
  font-weight: 600;
  font-size: 1rem;
}

.footer-links {
  display: flex;
  gap: 1.25rem;
}

.footer-links.column {
  flex-direction: column;
  align-items: flex-start;
  margin-top: 1rem;
}

/* MOBILE STYLING */
@media (max-width: 768px) {
  .footer-container {
    flex-direction: column;
    align-items: flex-start;
  }

  .footer-links {
    margin-top: 1rem;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .footer-links a {
    font-size: 0.95rem;
  }

  .brand-name {
    font-size: 0.9rem;
  }
}
</style>
