<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { showToast } from 'vant';
import api from '@/api';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';

const user = useUserStore();
const router = useRouter();
const info = ref<{ inviteUrl?: string; inviteCode?: string; status?: number } | null>(null);
const applying = ref(false);

async function loadInfo() {
  if (!user.isLoggedIn) return;
  info.value = await api.get('/distributor/me');
}

async function apply() {
  applying.value = true;
  try {
    await api.post('/distributor/apply');
    showToast('申请已提交');
    await loadInfo();
  } catch (e) {
    showToast((e as Error).message);
  } finally {
    applying.value = false;
  }
}

async function copyText(text: string, label: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast(`${label}已复制`);
  } catch {
    showToast('复制失败，请长按链接手动复制');
  }
}

function copyInviteUrl() {
  if (info.value?.inviteUrl) copyText(info.value.inviteUrl, '推广链接');
}

function copyInviteCode() {
  if (info.value?.inviteCode) copyText(info.value.inviteCode, '邀请码');
}

onMounted(loadInfo);
</script>

<template>
  <div>
    <div class="page-title">分销商</div>
    <p class="desc">推广用户付费可获得 CPS 佣金（一级分销）。</p>

    <van-button v-if="!user.isLoggedIn" type="primary" block @click="router.push('/login')">
      登录后申请
    </van-button>

    <template v-else>
      <van-button type="primary" block :loading="applying" @click="apply">
        {{ info?.inviteUrl ? '已是分销商' : '申请成为分销商' }}
      </van-button>

      <div v-if="info?.inviteUrl" class="invite-card">
        <div class="invite-row">
          <span class="invite-label">邀请码</span>
          <span class="invite-code">{{ info.inviteCode }}</span>
          <van-button size="small" type="primary" plain @click="copyInviteCode">复制</van-button>
        </div>

        <div class="invite-label" style="margin-top:16px;">推广链接</div>
        <div class="invite-url" @click="copyInviteUrl">{{ info.inviteUrl }}</div>
        <van-button block type="primary" @click="copyInviteUrl">一键复制链接</van-button>
        <p class="invite-tip">点击链接区域或上方按钮均可复制</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.desc {
  color: #646566;
  line-height: 1.6;
  margin-bottom: 16px;
}
.invite-card {
  margin-top: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.invite-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.invite-label {
  font-size: 13px;
  color: #969799;
}
.invite-code {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 2px;
  user-select: all;
  -webkit-user-select: all;
}
.invite-url {
  margin: 8px 0 12px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
  user-select: all;
  -webkit-user-select: all;
  color: #323233;
}
.invite-tip {
  margin: 10px 0 0;
  font-size: 12px;
  color: #969799;
  text-align: center;
}
</style>
