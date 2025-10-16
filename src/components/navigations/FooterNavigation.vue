<script lang="ts" setup>
import { Breakpoint } from '@/constants/Breakpoint';
import { useBreakpointManager } from '@/hooks/useBreakpointManager';
import { useNav } from '@/hooks/useNav'

const { redirectTo } = useNav()

const { isScreensizeBelow } = useBreakpointManager();

const flexFooterNavLinksColumn = isScreensizeBelow(Breakpoint.S);

</script>
<template>
  <footer class="footer">
    <div class="footer-nav">
      <el-container>
        <el-aside class="side">
          <div>
            <img src="../../../public/icon-dark.png" width="50px" />
          </div>
          <div>
            {{ 'Awense©' }}
          </div>
          <div>
            {{ '2025' }}
          </div>
        </el-aside>
        <div v-if="flexFooterNavLinksColumn" style="display: flex; flex-direction: column; width: 100%;">

          <el-main>
            <div>{{ 'Links' }}</div>
            <ul>
              <el-link @click="redirectTo('/')" type="primary">{{ 'Home' }}</el-link>
            </ul>
          </el-main>
        </div>
      </el-container>
    </div>
  </footer>
</template>

<style lang="css" scoped>
* {
  color: #333333;
}

.footer {
  background-color: #f8f9fa;
  padding: 1em;
  border-bottom: 1px solid #e9ecef;
  height: 150px;
}

.footer-nav {
  border-top: 1px solid rgba(0, 0, 0, 0.2);
  padding-top: 1rem;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

main {
  padding: 0;
}

ul {
  padding: 0;
}
</style>
