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
const loadingInfo = ref(false);
const qrDataUrl = ref('');
const pageTab = ref(0);
const listTab = ref(0);

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
const dashboardError = ref('');

const isDistributor = ref(false);

async function loadInfo() {
  if (!user.isLoggedIn) return;
  loadingInfo.value = true;
  try {
    info.value = (await api.get('/distributor/me')) as typeof info.value;
    isDistributor.value = !!info.value?.inviteUrl;
    if (isDistributor.value) {
      await loadDashboard();
    }
  } catch (e) {
    info.value = null;
    isDistributor.value = false;
    showToast((e as Error).message);
  } finally {
    loadingInfo.value = false;
  }
}

async function loadStats() {
  loadingStats.value = true;
  try {
    stats.value = await api.get('/distributor/stats');
    dashboardError.value = '';
  } catch (e) {
    stats.value = null;
    dashboardError.value = (e as Error).message || '加载失败，请确认已部署最新版本';
  } finally {
    loadingStats.value = false;
  }
}

async function loadReferrals() {
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
  await Promise.all([loadStats(), loadReferrals(), loadCommissions()]);
}

async function generateQr(url: string) {
  try {
    qrDataUrl.value = await QRCode.toDataURL(url, {
      width: 200,
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
    showToast('申请成功');
    await loadInfo();
    pageTab.value = 0;
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
    showToast('复制失败，请长按手动复制');
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
  showToast('已开始下载，微信内可长按图片保存');
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
  <div class="dist-page">
    <div class="page-title">分销中心</div>
    <p class="desc">查看推广用户与佣金；复制链接/二维码邀请好友。</p>

    <van-button v-if="!user.isLoggedIn" type="primary" block @click="router.push('/login')">
      登录后进入分销中心
    </van-button>

    <van-loading v-else-if="loadingInfo" vertical style="padding:32px;">加载中...</van-loading>

    <template v-else-if="!isDistributor">
      <van-button type="primary" block :loading="applying" @click="apply">
        申请成为分销商
      </van-button>
      <p class="hint">申请后即可获得专属推广链接，用户通过链接付费您可获得佣金。</p>
    </template>

    <template v-else>
      <van-tabs v-model:active="pageTab" type="card" class="main-tabs">
        <van-tab title="推广数据">
          <div class="section-head">数据概览</div>
          <div v-if="loadingStats" class="loading-tip">加载数据中...</div>
          <div v-else-if="dashboardError" class="error-tip">{{ dashboardError }}</div>
          <div v-else-if="stats" class="stats-grid">
            <div class="stat-item">
              <div class="stat-num">{{ stats.totalVisits }}</div>
              <div class="stat-label">绑定用户</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">{{ stats.paidUsers }}</div>
              <div class="stat-label">已付费</div>
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
              <div class="stat-label">成交额</div>
            </div>
          </div>

          <div class="section-head">明细列表</div>
          <van-tabs v-model:active="listTab" shrink>
            <van-tab title="推广用户">
              <van-loading v-if="loadingReferrals" vertical style="padding:24px;">加载中</van-loading>
              <van-empty v-else-if="referrals.length === 0" description="暂无推广用户，去分享推广链接吧" />
              <div v-else class="list">
                <div v-for="r in referrals" :key="r.userId" class="list-item">
                  <div class="list-head">
                    <span class="phone">{{ r.phoneMasked }}</span>
                    <van-tag v-if="r.hasPaid" type="success">已付费</van-tag>
                    <van-tag v-else>未付费</van-tag>
                  </div>
                  <div class="list-meta">绑定时间：{{ fmtTime(r.bindAt) }}</div>
                  <div v-if="r.hasPaid" class="list-meta">
                    付费 {{ r.paidOrderCount }} 笔 · {{ fmtMoney(r.paidAmount) }} · 佣金
                    {{ fmtMoney(r.commissionAmount) }}
                  </div>
                </div>
              </div>
            </van-tab>
            <van-tab title="佣金明细">
              <van-loading v-if="loadingCommissions" vertical style="padding:24px;">加载中</van-loading>
              <van-empty v-else-if="commissions.length === 0" description="暂无佣金，用户付费后会出现在这里" />
              <div v-else class="list">
                <div v-for="c in commissions" :key="c.orderNo" class="list-item">
                  <div class="list-head">
                    <span class="phone">{{ c.phoneMasked }}</span>
                    <span class="commission">{{ fmtMoney(c.commissionAmount) }}</span>
                  </div>
                  <div class="list-meta">{{ c.productName }} · 订单 {{ fmtMoney(c.orderAmount) }}</div>
                  <div class="list-meta">{{ fmtTime(c.paidAt) }} · {{ c.statusLabel }}</div>
                </div>
              </div>
            </van-tab>
          </van-tabs>

          <van-button block plain type="primary" style="margin-top:12px;" @click="loadDashboard">
            刷新数据
          </van-button>
        </van-tab>

        <van-tab title="推广工具">
          <div class="invite-card">
            <div class="invite-row">
              <span class="invite-label">邀请码</span>
              <span class="invite-code">{{ info?.inviteCode }}</span>
              <van-button size="small" type="primary" plain @click="copyInviteCode">复制</van-button>
            </div>
            <div class="invite-label" style="margin-top:12px;">推广链接</div>
            <div class="invite-url" @click="copyInviteUrl">{{ info?.inviteUrl }}</div>
            <van-button block type="primary" @click="copyInviteUrl">复制推广链接</van-button>
            <div class="qr-section">
              <div class="invite-label" style="margin-top:16px;">推广二维码</div>
              <div class="qr-wrap">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="推广二维码" class="qr-img" />
              </div>
              <van-button block plain type="primary" @click="saveQrCode">保存二维码</van-button>
            </div>
          </div>
        </van-tab>
      </van-tabs>
    </template>
  </div>
</template>

<style scoped>
.dist-page {
  padding-bottom: 24px;
}
.desc {
  color: #646566;
  line-height: 1.6;
  margin-bottom: 12px;
  font-size: 14px;
}
.hint {
  margin-top: 12px;
  font-size: 13px;
  color: #969799;
  line-height: 1.5;
}
.main-tabs {
  margin-top: 12px;
}
.section-head {
  margin: 16px 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}
.invite-card {
  margin-top: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}
.qr-section {
  text-align: center;
}
.qr-wrap {
  display: flex;
  justify-content: center;
  margin: 12px 0;
}
.qr-img {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  border: 1px solid #ebedf0;
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
  font-size: 13px;
  line-height: 1.6;
  word-break: break-all;
}
.loading-tip,
.error-tip {
  text-align: center;
  padding: 16px;
  font-size: 13px;
  color: #969799;
}
.error-tip {
  color: #ee0a24;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.stat-item {
  background: #fff;
  border-radius: 10px;
  padding: 10px 6px;
  text-align: center;
  border: 1px solid #ebedf0;
}
.stat-item.highlight .stat-num {
  color: #ee0a24;
}
.stat-num {
  font-size: 15px;
  font-weight: 600;
}
.stat-label {
  margin-top: 4px;
  font-size: 11px;
  color: #969799;
}
.list {
  padding: 8px 0;
}
.list-item {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #ebedf0;
}
.list-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
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
  line-height: 1.5;
}
</style>
