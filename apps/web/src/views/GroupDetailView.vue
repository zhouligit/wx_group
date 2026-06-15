<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showToast } from 'vant';
import {
  createOrder,
  fetchGroupDetail,
  fetchProducts,
  fetchQrcode,
  mockPay,
  type GroupDetail,
  type Product,
} from '@/api';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const user = useUserStore();
const group = ref<GroupDetail | null>(null);
const qrcodeUrl = ref('');
const products = ref<Product[]>([]);
const paying = ref(false);

const groupId = Number(route.params.id);

async function load() {
  group.value = await fetchGroupDetail(groupId) as GroupDetail;
  if (!group.value.qrcodeLocked && user.isLoggedIn) {
    await loadQrcode();
  }
}

async function loadQrcode() {
  const data = await fetchQrcode(groupId) as { url: string };
  qrcodeUrl.value = data.url;
}

async function buyUnlock() {
  if (!user.isLoggedIn) return router.push({ name: 'login', query: { redirect: route.fullPath } });
  paying.value = true;
  try {
    const unlock = products.value.find((p) => p.skuCode === 'UNLOCK');
    if (!unlock) throw new Error('商品不存在');
    const order = await createOrder(unlock.id, groupId) as { orderNo: string };
    await mockPay(order.orderNo);
    showToast('解锁成功');
    await load();
  } catch (e) {
    showToast((e as Error).message);
  } finally {
    paying.value = false;
  }
}

onMounted(async () => {
  products.value = await fetchProducts() as Product[];
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
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px;">
        <van-button type="primary" block @click="router.push('/membership')">¥19.9 开通月会员</van-button>
        <van-button plain type="primary" block :loading="paying" @click="buyUnlock">¥9.9 解锁本群</van-button>
      </div>
    </div>

    <div v-else style="text-align:center;margin-top:16px;">
      <img v-if="qrcodeUrl" :src="qrcodeUrl" alt="群二维码" style="width:220px;height:220px;border-radius:8px;" />
      <div style="margin-top:8px;color:#969799;">长按保存 · 微信扫一扫入群</div>
      <van-button style="margin-top:12px;" @click="router.push('/support')">加群失败？联系客服</van-button>
    </div>
  </div>
</template>
