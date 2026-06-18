<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import AppNav from './components/AppNav.vue';
import { useUserStore } from './stores/user';

const user = useUserStore();

onMounted(() => {
  if (user.isLoggedIn) user.syncDistBinding();
});
</script>

<template>
  <div class="app-shell">
    <header v-if="!$route.meta.hideNav" class="desktop-nav">
      <AppNav mode="desktop" />
    </header>
    <main class="app-main">
      <RouterView />
    </main>
    <footer v-if="!$route.meta.hideNav" class="mobile-nav">
      <AppNav mode="mobile" />
    </footer>
  </div>
</template>
