import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '@/views/LoginView.vue';
import DashboardView from '@/views/DashboardView.vue';

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/', component: DashboardView },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token');
  if (to.path !== '/login' && !token) return '/login';
});

export default router;
