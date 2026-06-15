<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '@/api';

const router = useRouter();
const username = ref('admin');
const password = ref('admin123');
const loading = ref(false);

async function submit() {
  loading.value = true;
  try {
    const data = await api.post('/admin/auth/login', { username: username.value, password: password.value }) as { token: string };
    if (!data?.token) throw new Error('登录失败');
    localStorage.setItem('admin_token', data.token);
    ElMessage.success('登录成功');
    router.push('/');
  } catch (e) {
    ElMessage.error((e as Error).message);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="max-width:420px;margin:80px auto;padding:24px;background:#fff;border-radius:8px;">
    <h2>管理后台登录</h2>
    <el-form @submit.prevent="submit">
      <el-form-item label="用户名"><el-input v-model="username" /></el-form-item>
      <el-form-item label="密码"><el-input v-model="password" type="password" /></el-form-item>
      <el-button type="primary" :loading="loading" @click="submit">登录</el-button>
    </el-form>
  </div>
</template>
