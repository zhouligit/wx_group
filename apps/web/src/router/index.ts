import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import GroupDetailView from '@/views/GroupDetailView.vue';
import LoginView from '@/views/LoginView.vue';
import MembershipView from '@/views/MembershipView.vue';
import SupportView from '@/views/SupportView.vue';
import DistributorView from '@/views/DistributorView.vue';
import UserView from '@/views/UserView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/group/:id', name: 'group', component: GroupDetailView },
    { path: '/login', name: 'login', component: LoginView, meta: { hideNav: true } },
    { path: '/membership', name: 'membership', component: MembershipView },
    { path: '/support', name: 'support', component: SupportView },
    { path: '/distributor', name: 'distributor', component: DistributorView },
    { path: '/user', name: 'user', component: UserView },
    { path: '/activities', name: 'activities', component: () => import('@/views/ActivitiesView.vue') },
  ],
});

router.beforeEach((to) => {
  const code = to.query.d as string | undefined;
  if (code) {
    document.cookie = `dist_code=${code}; path=/; max-age=7776000`;
  }
});

export default router;
