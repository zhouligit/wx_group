<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import api from '@/api';

const user = useUserStore();
const router = useRouter();
const isDistributor = ref(false);

onMounted(async () => {
  if (!user.isLoggedIn) return;
  try {
    const me = (await api.get('/distributor/me')) as { inviteUrl?: string } | null;
    isDistributor.value = !!me?.inviteUrl;
  } catch {
    isDistributor.value = false;
  }
});
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
      <van-cell-group inset style="margin-top:12px;">
        <van-cell
          title="分销中心"
          :label="isDistributor ? '查看推广用户与佣金' : '申请成为分销商'"
          is-link
          @click="router.push('/distributor')"
        />
        <van-cell title="开通会员" is-link @click="router.push('/membership')" />
      </van-cell-group>
      <van-button style="margin-top:12px;" block @click="user.logout(); router.push('/')">退出登录</van-button>
    </div>
  </div>
</template>
