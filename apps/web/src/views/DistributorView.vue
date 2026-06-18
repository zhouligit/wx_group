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
const activeTab = ref(0);

const stats = ref<{
  totalVisits: number;
  paidUsers: number;
  totalOrders: number;
  totalOrderAmount: number;
  totalCommission: number;
  pendingCommission: number;
} | null>(null);

const referrals = ref<
  Array<{
    userId: number;
    phoneMasked: string;
    nickname: string | null;
    bindAt: string;
    hasPaid: boolean;
    paidOrderCount: number;
    paidAmount: number;
    commissionAmount: number;
    lastPaidAt: string | null;
  }>
>([]);

const commissions = ref<
  Array<{
    orderNo: string;
    phoneMasked: string;
    productName: string;
    orderAmount: number;
    commissionAmount: number;
    statusLabel: string;
    paidAt: string | null;
  }>
>([]);

const loadingStats = ref(false);
const loadingReferrals = ref(false);
const loadingCommissions = ref(false);

async function loadInfo() {
  if (!user.isLoggedIn) return;
  info.value = await api.get('/distributor/me');
}

async function loadStats() {
  if (!user.isLoggedIn || !info.value?.inviteUrl) return;
  loadingStats.value = true;
  try {
    stats.value = await api.get('/distributor/stats');
  } catch {
    stats.value = null;
  } finally {
    loadingStats.value = false;
  }
}

async function loadReferrals() {
  if (!user.isLoggedIn || !info.value?.inviteUrl) return;
  loadingReferrals.value = true;
  try {
    const data = (await api.get('/distributor/referrals', {
      params: { page: 1, pageSize: 50 },
    })) as { list: typeof referrals.value };
    referrals.value = data.list;
  } catch {
    referrals.value = [];
  } finally {
    loadingReferrals.value = false;
  }
}

async function loadCommissions() {
  if (!user.isLoggedIn || !info.value?.inviteUrl) return;
  loadingCommissions.value = true;
  try {
    const data = (await api.get('/distributor/commissions', {
      params: { page: 1, pageSize: 50 },
    })) as { list: typeof commissions.value };
    commissions.value = data.list;
  } catch {
    commissions.value = [];
  } finally {
    loadingCommissions.value = false;
  }
}

async function loadDashboard() {
  await loadStats();
  await loadReferrals();
  await loadCommissions();
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
    if (url) {
      generateQr(url);
      loadDashboard();
    } else {
      qrDataUrl.value = '';
    }
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

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return iso.replace('T', ' ').slice(0, 16);
}

function fmtMoney(n: number) {
  return `¥${n.toFixed(2)}`;
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
          <p class="qr-desc">用户扫码进入即带你的推广参数</p>
          <div class="qr-wrap">
            <img v-if="qrDataUrl" :src="qrDataUrl" alt="推广二维码" class="qr-img" />
          </div>
          <van-button block plain type="primary" @click="saveQrCode">保存二维码</van-button>
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

      <div v-if="info?.inviteUrl" class="dashboard">
        <div v-if="loadingStats" class="loading-tip">加载数据中...</div>
        <div v-else-if="stats" class="stats-grid">
          <div class="stat-item">
            <div class="stat-num">{{ stats.totalVisits }}</div>
            <div class="stat-label">绑定用户</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ stats.paidUsers }}</div>
            <div class="stat-label">已付费用户</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ stats.totalOrders }}</div>
            <div class="stat-label">推广订单</div>
          </div>
          <div class="stat-item highlight">
            <div class="stat-num">{{ fmtMoney(stats.totalCommission) }}</div>
            <div class="stat-label">累计佣金</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ fmtMoney(stats.pendingCommission) }}</div>
            <div class="stat-label">待结算</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ fmtMoney(stats.totalOrderAmount) }}</div>
            <div class="stat-label">推广成交额</div>
          </div>
        </div>

        <van-tabs v-model:active="activeTab" shrink sticky offset-top="0">
          <van-tab title="推广用户">
            <van-loading v-if="loadingReferrals" vertical style="padding:24px;">加载中</van-loading>
            <van-empty v-else-if="referrals.length === 0" description="暂无绑定用户" />
            <div v-else class="list">
              <div v-for="r in referrals" :key="r.userId" class="list-item">
                <div class="list-head">
                  <span class="phone">{{ r.phoneMasked }}</span>
                  <van-tag v-if="r.hasPaid" type="success" size="medium">已付费</van-tag>
                  <van-tag v-else type="default" size="medium">未付费</van-tag>
                </div>
                <div class="list-meta">
                  绑定：{{ fmtTime(r.bindAt) }}
                </div>
                <div v-if="r.hasPaid" class="list-meta">
                  付费 {{ r.paidOrderCount }} 笔 · 成交额 {{ fmtMoney(r.paidAmount) }} · 佣金
                  {{ fmtMoney(r.commissionAmount) }}
                </div>
                <div v-if="r.lastPaidAt" class="list-meta">最近付费：{{ fmtTime(r.lastPaidAt) }}</div>
              </div>
            </div>
          </van-tab>

          <van-tab title="佣金明细">
            <van-loading v-if="loadingCommissions" vertical style="padding:24px;">加载中</van-loading>
            <van-empty v-else-if="commissions.length === 0" description="暂无佣金记录" />
            <div v-else class="list">
              <div v-for="c in commissions" :key="c.orderNo" class="list-item">
                <div class="list-head">
                  <span class="phone">{{ c.phoneMasked }}</span>
                  <span class="commission">{{ fmtMoney(c.commissionAmount) }}</span>
                </div>
                <div class="list-meta">{{ c.productName }} · 订单 {{ fmtMoney(c.orderAmount) }}</div>
                <div class="list-meta">
                  {{ c.orderNo }} · {{ c.statusLabel }} · {{ fmtTime(c.paidAt) }}
                </div>
              </div>
            </div>
          </van-tab>
        </van-tabs>
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
}
.invite-url {
  margin: 8px 0 12px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
  color: #323233;
}
.dashboard {
  margin-top: 16px;
}
.loading-tip {
  text-align: center;
  color: #969799;
  padding: 16px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.stat-item {
  background: #fff;
  border-radius: 10px;
  padding: 12px 8px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.stat-item.highlight .stat-num {
  color: #ee0a24;
}
.stat-num {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}
.stat-label {
  margin-top: 4px;
  font-size: 11px;
  color: #969799;
}
.list {
  padding: 8px 0 16px;
}
.list-item {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.list-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.phone {
  font-weight: 600;
  flex: 1;
}
.commission {
  color: #ee0a24;
  font-weight: 600;
}
.list-meta {
  font-size: 12px;
  color: #969799;
  line-height: 1.6;
}
</style>
