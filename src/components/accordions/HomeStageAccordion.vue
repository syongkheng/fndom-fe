<script setup lang="ts">
import { useNav } from '@/hooks/useNav';
import { ArrowRight, InfoFilled } from '@element-plus/icons-vue'

const navigate = useNav();
</script>

<template>
  <div class="collapisble">
    <el-collapse accordion>
      <el-collapse-item name="pphs">
        <template #title="{ isActive }">
          <div :class="['title-wrapper', { 'is-active': isActive }]">
            PPHS
            <el-icon class="header-icon">
              <info-filled />
            </el-icon>
          </div>
        </template>
        <div class="description-wrapper">
          Parenthood Provisional Housing Scheme (PPHS)<br />
          Take a look at the different available locations and see which one suits you best!
        </div>
        <div class="cta-wrapper">
          <el-button type="primary" @click="navigate.redirectToPphs()">
            <span>Find out more</span>
            <el-icon class="el-icon--right">
              <ArrowRight />
            </el-icon>
          </el-button>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.title-wrapper {
  padding-left: 1rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.description-wrapper {
  padding-left: 1rem;
}

.cta-wrapper {
  margin-top: 0.75rem;
  padding-left: 1rem;
}

.title-wrapper.is-active {
  color: var(--el-color-primary);
}
</style>
