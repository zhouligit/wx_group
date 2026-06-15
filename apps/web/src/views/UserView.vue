<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';

const user = useUserStore();
const router = useRouter();
</script>

<template>
  <div>
    <div class="page-title">个人中心</div>
    <div v-if="!user.isLoggedIn" class="group-card">
      <van-button type="primary" block @click="router.push('/login')">登录</van-button>
    </div>
    <div v-else class="group-card">
      <div>{{ user.profile?.nickname || '用户' }}</div>
      <div class="meta">{{ user.profile?.phone }}</div>
      <van-button style="margin-top:12px;" block @click="user.logout(); router.push('/')">退出登录</van-button>
    </div>
  </div>
</template>
