<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { showToast } from 'vant';
import { createOrder, fetchProducts, mockPay, type Product } from '@/api';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';

const user = useUserStore();
const router = useRouter();
const products = ref<Product[]>([]);
const loadingSku = ref<number | null>(null);

async function buy(product: Product) {
  if (!user.isLoggedIn) return router.push({ name: 'login', query: { redirect: '/membership' } });
  loadingSku.value = product.id;
  try {
    const order = await createOrder(product.id) as { orderNo: string };
    await mockPay(order.orderNo);
    showToast('开通成功');
  } catch (e) {
    showToast((e as Error).message);
  } finally {
    loadingSku.value = null;
  }
}

onMounted(async () => {
  products.value = (await fetchProducts() as Product[]).filter((p) => p.skuCode !== 'UNLOCK');
});
</script>

<template>
  <div>
    <div class="page-title">开通会员</div>
    <div v-for="p in products" :key="p.id" class="group-card" style="margin-bottom:12px;">
      <h3>{{ p.name }}</h3>
      <div class="meta">¥{{ p.price }} · {{ p.durationDays }} 天有效</div>
      <van-button type="primary" size="small" style="margin-top:8px;" :loading="loadingSku === p.id" @click="buy(p)">
        立即开通
      </van-button>
    </div>
  </div>
</template>
