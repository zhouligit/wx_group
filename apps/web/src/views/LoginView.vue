<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showToast } from 'vant';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const user = useUserStore();
const phone = ref('');
const code = ref('');
const sending = ref(false);
const loading = ref(false);

async function sendCode() {
  if (!/^1\d{10}$/.test(phone.value)) return showToast('请输入正确手机号');
  sending.value = true;
  try {
    await user.sendCode(phone.value);
    showToast('验证码已发送（开发环境：123456）');
  } catch (e) {
    showToast((e as Error).message);
  } finally {
    sending.value = false;
  }
}

async function submit() {
  loading.value = true;
  try {
    await user.login(phone.value, code.value);
    showToast('登录成功');
    const redirect = (route.query.redirect as string) || '/';
    router.replace(redirect);
  } catch (e) {
    showToast((e as Error).message);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="max-width:400px;margin:40px auto;padding:16px;">
    <h2>手机号登录</h2>
    <van-field v-model="phone" label="手机号" placeholder="请输入手机号" />
    <van-field v-model="code" label="验证码" placeholder="请输入验证码">
      <template #button>
        <van-button size="small" :loading="sending" @click="sendCode">获取验证码</van-button>
      </template>
    </van-field>
    <van-button type="primary" block :loading="loading" style="margin-top:16px;" @click="submit">登录</van-button>
  </div>
</template>
