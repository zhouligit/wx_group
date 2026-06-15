<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/api';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';

const user = useUserStore();
const router = useRouter();
const info = ref<{ inviteUrl?: string; status?: number } | null>(null);

onMounted(async () => {
  if (!user.isLoggedIn) return;
  info.value = await api.get('/distributor/me');
});
</script>

<template>
  <div>
    <div class="page-title">分销商</div>
    <p>推广用户付费可获得 CPS 佣金（一级分销）。</p>
    <van-button v-if="!user.isLoggedIn" type="primary" @click="router.push('/login')">登录后申请</van-button>
    <template v-else>
      <van-button type="primary" @click="api.post('/distributor/apply')">申请成为分销商</van-button>
      <div v-if="info?.inviteUrl" class="group-card" style="margin-top:12px;">
        <div>推广链接</div>
        <code style="word-break:break-all;">{{ info.inviteUrl }}</code>
      </div>
    </template>
  </div>
</template>
