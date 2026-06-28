<script lang="ts" setup>
import { computed } from 'vue'
import { useNav } from '@/hooks/useNav'
import { usePermission } from '@/composables/usePermission'
import { useI18n } from 'vue-i18n'

const { redirectTo } = useNav()
const { hasModuleAccess } = usePermission()
const { t } = useI18n()
const isInternal = computed(() => hasModuleAccess('SYSTEM', 5))

const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="footer-inner">

      <!-- Brand -->
      <div class="footer-brand">
        <img src="/awense-logo.png" alt="Awense" width="36" class="footer-logo" />
        <div>
          <div class="brand-name">Awense <span class="beta-badge">{{ t('footer.betaBadge') }}</span></div>
          <div class="brand-tagline">{{ t('footer.tagline') }}</div>
        </div>
      </div>

      <!-- Sitemap -->
      <div class="footer-sitemap">

        <div class="footer-col">
          <div class="col-heading">{{ t('footer.sections.plan') }}</div>
          <ul class="col-links">
            <li><button class="footer-link" @click="redirectTo('/travel')">{{ t('nav.travel') }}</button></li>
            <li><button class="footer-link" @click="redirectTo('/llm')">{{ t('footer.links.aiMarketplace') }}</button></li>
          </ul>
        </div>

        <div class="footer-col">
          <div class="col-heading">{{ t('footer.sections.general') }}</div>
          <ul class="col-links">
            <li><button class="footer-link" @click="redirectTo('/')">{{ t('footer.links.home') }}</button></li>
            <li><button class="footer-link" @click="redirectTo('/profile')">{{ t('footer.links.profile') }}</button></li>
          </ul>
        </div>

      </div>

    </div>

    <!-- Bottom bar -->
    <div class="footer-bottom">
      <span>© {{ year }} Awense</span>
      <span class="footer-bottom-right">{{ t('footer.allRights') }}</span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 36px 2rem 0;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 48px;
  flex-wrap: wrap;
  padding-bottom: 32px;
}

/* Brand */
.footer-brand {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 200px;
  flex: 1;
}

.footer-logo {
  margin-top: 2px;
  flex-shrink: 0;
}

.brand-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
}

.beta-badge {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  color: var(--el-color-primary);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 25%, transparent);
}

.brand-tagline {
  font-size: 0.78rem;
  color: var(--color-text);
  opacity: 0.5;
  line-height: 1.4;
}

/* Sitemap */
.footer-sitemap {
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
  flex: 2;
  justify-content: flex-end;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 110px;
}

.col-heading {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text);
  opacity: 0.4;
}

.col-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.75;
  text-align: left;
  transition: opacity 0.15s, color 0.15s;
  line-height: 1;
}

.footer-link:hover {
  opacity: 1;
  color: var(--el-color-primary);
}

/* Bottom bar */
.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  border-top: 1px solid var(--color-border);
  padding: 14px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.45;
}

.footer-bottom-right {
  font-size: 0.72rem;
}

/* Mobile */
@media (max-width: 640px) {
  .footer {
    padding: 28px 1.25rem 0;
  }

  .footer-inner {
    flex-direction: column;
    gap: 28px;
  }

  .footer-sitemap {
    justify-content: flex-start;
    gap: 28px;
  }

  .footer-bottom-right {
    display: none;
  }
}
</style>
