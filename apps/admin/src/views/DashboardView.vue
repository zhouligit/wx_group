<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/api';

const stats = ref<{ userCount: number; groupCount: number; paidOrderCount: number } | null>(null);
const groups = ref<{ id: number; name: string; status: number; isHot: number }[]>([]);

onMounted(async () => {
  stats.value = await api.get('/admin/dashboard');
  groups.value = await api.get('/admin/groups');
});
</script>

<template>
  <div style="padding:24px;">
    <h2>仪表盘</h2>
    <el-row :gutter="16" style="margin-bottom:24px;">
      <el-col :span="8"><el-card>用户数：{{ stats?.userCount ?? '-' }}</el-card></el-col>
      <el-col :span="8"><el-card>群数量：{{ stats?.groupCount ?? '-' }}</el-card></el-col>
      <el-col :span="8"><el-card>付费订单：{{ stats?.paidOrderCount ?? '-' }}</el-card></el-col>
    </el-row>

    <h3>群列表</h3>
    <el-table :data="groups" stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="群名称" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="isHot" label="热门" width="80" />
    </el-table>
  </div>
</template>
