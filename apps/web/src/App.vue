<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppNav from './components/AppNav.vue';
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
