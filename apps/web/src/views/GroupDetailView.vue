<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showToast } from 'vant';
import {
  createOrder,
  displayPrice,
  fetchGroupDetail,
  fetchProducts,
  fetchPublicConfig,
  fetchQrcode,
  payOrder,
  type GroupDetail,
  type Product,
  type PublicConfig,
} from '@/api/payment';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const user = useUserStore();
const group = ref<GroupDetail | null>(null);
const qrcodeUrl = ref('');
const products = ref<Product[]>([]);
const config = ref<PublicConfig | null>(null);
const paying = ref(false);

const groupId = Number(route.params.id);
const unlockProduct = ref<Product | null>(null);

async function load() {
  group.value = (await fetchGroupDetail(groupId)) as GroupDetail;
  if (!group.value.qrcodeLocked && user.isLoggedIn) {
    await loadQrcode();
  }
}

async function loadQrcode() {
  const data = (await fetchQrcode(groupId)) as { url: string };
  qrcodeUrl.value = data.url;
}

async function buyUnlock() {
  if (!user.isLoggedIn) return router.push({ name: 'login', query: { redirect: route.fullPath } });
  paying.value = true;
  try {
    const unlock = products.value.find((p) => p.skuCode === 'UNLOCK');
    if (!unlock) throw new Error('商品不存在');
    const order = (await createOrder(unlock.id, groupId)) as { orderNo: string };
    await payOrder(order.orderNo);
    showToast('支付成功');
    qrcodeUrl.value = '';
    await refreshAfterPay();
  } catch (e) {
    showToast((e as Error).message);
  } finally {
    paying.value = false;
  }
}

/** 支付后等待回调落库并刷新二维码（最多约 30s） */
async function refreshAfterPay() {
  for (let i = 0; i < 15; i++) {
    await load();
    if (group.value && !group.value.qrcodeLocked && qrcodeUrl.value) {
      showToast('解锁成功');
      return;
    }
    await sleep(2000);
  }
  showToast('已支付，请下拉刷新页面');
}

onMounted(async () => {
  config.value = await fetchPublicConfig();
  products.value = (await fetchProducts()) as Product[];
  unlockProduct.value = products.value.find((p) => p.skuCode === 'UNLOCK') ?? null;
  await load();
});
</script>

<template>
  <div v-if="group">
    <div class="page-title">{{ group.name }}</div>
    <div class="meta" style="color:#969799;margin-bottom:12px;">
      {{ group.tags.join(' · ') }} · {{ group.regionName }}
    </div>
    <p style="line-height:1.6;">{{ group.description }}</p>

    <div v-if="group.qrcodeLocked" class="qrcode-lock">
      <div class="placeholder">🔒</div>
      <div>开通会员查看入群二维码</div>
      <div v-if="config?.paymentTestMode" style="margin-top:8px;font-size:12px;color:#ee0a24;">
        测试阶段实付 ¥{{ config.paymentTestAmount }}
      </div>
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px;">
        <van-button type="primary" block @click="router.push('/membership')">开通会员</van-button>
        <van-button
          v-if="unlockProduct"
          plain
          type="primary"
          block
          :loading="paying"
          @click="buyUnlock"
        >
          微信支付解锁本群 ¥{{ displayPrice(unlockProduct, config) }}
        </van-button>
      </div>
    </div>

    <div v-else style="text-align:center;margin-top:16px;">
      <img v-if="qrcodeUrl" :src="qrcodeUrl" alt="群二维码" style="width:220px;height:220px;border-radius:8px;" />
      <div v-else style="color:#969799;padding:24px;">二维码加载中...</div>
      <div style="margin-top:8px;color:#969799;">长按保存 · 微信扫一扫入群</div>
      <van-button style="margin-top:12px;" @click="router.push('/support')">加群失败？联系客服</van-button>
    </div>
  </div>
</template>
