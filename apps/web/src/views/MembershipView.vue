<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { showToast } from 'vant';
import {
  createOrder,
  displayPrice,
  fetchProducts,
  fetchPublicConfig,
  payOrder,
  type Product,
  type PublicConfig,
} from '@/api/payment';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';

const user = useUserStore();
const router = useRouter();
const products = ref<Product[]>([]);
const config = ref<PublicConfig | null>(null);
const loadingSku = ref<number | null>(null);

async function buy(product: Product) {
  if (!user.isLoggedIn) return router.push({ name: 'login', query: { redirect: '/membership' } });
  loadingSku.value = product.id;
  try {
    const order = (await createOrder(product.id)) as { orderNo: string };
    await payOrder(order.orderNo, window.location.href);
    showToast('开通成功');
  } catch (e) {
    showToast((e as Error).message);
  } finally {
    loadingSku.value = null;
  }
}

onMounted(async () => {
  config.value = await fetchPublicConfig();
  products.value = ((await fetchProducts()) as Product[]).filter((p) => p.skuCode !== 'UNLOCK');
});
</script>

<template>
  <div>
    <div class="page-title">开通会员</div>
    <div v-if="config?.paymentTestMode" style="margin-bottom:12px;color:#ee0a24;font-size:13px;">
      测试阶段实付 ¥{{ config.paymentTestAmount }}
    </div>
    <div v-for="p in products" :key="p.id" class="group-card" style="margin-bottom:12px;">
      <h3>{{ p.name }}</h3>
      <div class="meta">
        ¥{{ displayPrice(p, config) }}
        <span v-if="config?.paymentTestMode" style="text-decoration:line-through;color:#969799;margin-left:6px;">
          ¥{{ p.price }}
        </span>
        · {{ p.durationDays }} 天有效
      </div>
      <van-button type="primary" size="small" style="margin-top:8px;" :loading="loadingSku === p.id" @click="buy(p)">
        微信支付开通
      </van-button>
    </div>
  </div>
</template>
