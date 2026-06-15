<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';

defineProps<{ mode: 'mobile' | 'desktop' }>();

const route = useRoute();
const tabs = [
  { to: '/', label: '微信群' },
  { to: '/support', label: '客服' },
  { to: '/activities', label: '线下游玩' },
  { to: '/distributor', label: '分销商' },
];

function isActive(path: string) {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}
</script>

<template>
  <nav :class="mode">
    <RouterLink v-for="tab in tabs" :key="tab.to" :to="tab.to" :class="{ active: isActive(tab.to) }">
      {{ tab.label }}
    </RouterLink>
    <RouterLink to="/user" :class="{ active: route.path === '/user' }">我的</RouterLink>
  </nav>
</template>

<style scoped>
nav.mobile {
  display: grid; grid-template-columns: repeat(5, 1fr); text-align: center; padding: 8px 0;
}
nav.desktop {
  max-width: 1200px; margin: 0 auto; display: flex; gap: 24px; padding: 12px 16px;
}
a { color: #646566; text-decoration: none; font-size: 14px; }
a.active { color: #667eea; font-weight: 600; }
</style>
