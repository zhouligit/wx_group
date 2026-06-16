<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { showToast } from 'vant';
import QRCode from 'qrcode';
import api from '@/api';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';

const user = useUserStore();
const router = useRouter();
const info = ref<{ inviteUrl?: string; inviteCode?: string; status?: number } | null>(null);
const applying = ref(false);
const qrDataUrl = ref('');

async function loadInfo() {
  if (!user.isLoggedIn) return;
  info.value = await api.get('/distributor/me');
}

async function generateQr(url: string) {
  try {
    qrDataUrl.value = await QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: { dark: '#323233', light: '#ffffff' },
    });
  } catch {
    qrDataUrl.value = '';
  }
}

watch(
  () => info.value?.inviteUrl,
  (url) => {
    if (url) generateQr(url);
    else qrDataUrl.value = '';
  },
);

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

function saveQrCode() {
  if (!qrDataUrl.value) return;
  const a = document.createElement('a');
  a.href = qrDataUrl.value;
  a.download = `推广二维码-${info.value?.inviteCode ?? 'dist'}.png`;
  a.click();
  showToast('已开始下载，手机端可长按图片保存');
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
        <div class="qr-section">
          <div class="invite-label">推广二维码</div>
          <p class="qr-desc">用户扫码进入即带你的推广参数，可发朋友圈、线下海报</p>
          <div class="qr-wrap">
            <img v-if="qrDataUrl" :src="qrDataUrl" alt="推广二维码" class="qr-img" />
          </div>
          <van-button block plain type="primary" @click="saveQrCode">保存二维码</van-button>
          <p class="invite-tip">微信内可长按图片保存到相册</p>
        </div>

        <div class="divider" />

        <div class="invite-row">
          <span class="invite-label">邀请码</span>
          <span class="invite-code">{{ info.inviteCode }}</span>
          <van-button size="small" type="primary" plain @click="copyInviteCode">复制</van-button>
        </div>

        <div class="invite-label" style="margin-top:16px;">推广链接</div>
        <div class="invite-url" @click="copyInviteUrl">{{ info.inviteUrl }}</div>
        <van-button block type="primary" @click="copyInviteUrl">一键复制链接</van-button>
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
.qr-section {
  text-align: center;
}
.qr-desc {
  margin: 6px 0 12px;
  font-size: 13px;
  color: #969799;
  line-height: 1.5;
}
.qr-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
.qr-img {
  width: 240px;
  height: 240px;
  border-radius: 8px;
  border: 1px solid #ebedf0;
}
.divider {
  height: 1px;
  background: #ebedf0;
  margin: 20px 0;
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
