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
        <div class="brand-name">AWENSE <span class="beta-badge">{{ t('footer.betaBadge') }}</span></div>
        <div class="brand-tagline">{{ t('footer.tagline') }}</div>
      </div>

      <!-- Sitemap -->
      <div class="footer-sitemap">
        <div class="footer-col">
          <div class="col-heading">{{ t('footer.sections.modules') }}</div>
          <ul class="col-links">
            <li><button type="button" class="footer-link" @click="redirectTo('/house')">{{ t('nav.house') }}</button></li>
            <li><button type="button" class="footer-link" @click="redirectTo('/budget')">{{ t('nav.budget') }}</button></li>
            <li><button type="button" class="footer-link" @click="redirectTo('/travel/trips')">{{ t('nav.trips') }}</button></li>
            <li><button type="button" class="footer-link" @click="redirectTo('/apple-pay')">{{ t('nav.applePay') }}</button></li>
            <li v-if="isInternal"><button type="button" class="footer-link" @click="redirectTo('/admin')">{{ t('nav.admin') }}</button></li>
          </ul>
        </div>

        <div class="footer-col">
          <div class="col-heading">{{ t('footer.sections.general') }}</div>
          <ul class="col-links">
            <li><button type="button" class="footer-link" @click="redirectTo('/')">{{ t('footer.links.home') }}</button></li>
            <li><button type="button" class="footer-link" @click="redirectTo('/profile')">{{ t('footer.links.profile') }}</button></li>
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
  min-width: 200px;
  flex: 1;
}

.brand-name {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--color-heading);
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 6px;
}

.beta-badge {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: var(--radius);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
}

.brand-tagline {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
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
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
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
  text-align: left;
  transition: color 0.15s;
  line-height: 1;
}

.footer-link:hover {
  color: var(--color-primary);
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
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: var(--color-text-tertiary);
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
