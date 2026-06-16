<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchGroups, fetchRegions, type GroupItem } from '@/api';

const router = useRouter();
const regions = ref<{ id: number; name: string }[]>([]);
const activeRegionId = ref<number | null>(null);
const groups = ref<GroupItem[]>([]);
const loading = ref(false);

async function loadGroups() {
  loading.value = true;
  try {
    const data = await fetchGroups({
      page: 1,
      regionId: activeRegionId.value ?? undefined,
      hot: activeRegionId.value === null,
    }) as { list: GroupItem[] };
    groups.value = data.list;
  } finally {
    loading.value = false;
  }
}

function selectRegion(id: number | null) {
  activeRegionId.value = id;
  loadGroups();
}

onMounted(async () => {
  regions.value = await fetchRegions() as { id: number; name: string }[];
  await loadGroups();
});
</script>

<template>
  <div>
    <div class="slogan">
      <div style="font-size:18px;font-weight:600;">搭子式交友 · 摆脱传统交友概念！</div>
      <div style="font-size:13px;opacity:.9;margin-top:6px;">加群失败请联系客服</div>
    </div>

    <div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px;">
      <button class="tab" :class="{ active: activeRegionId === null }" @click="selectRegion(null)">热门群</button>
      <button
        v-for="r in regions"
        :key="r.id"
        class="tab"
        :class="{ active: activeRegionId === r.id }"
        @click="selectRegion(r.id)"
      >
        {{ r.name }}
      </button>
    </div>

    <div v-if="loading" style="text-align:center;padding:24px;">加载中...</div>
    <div v-else class="group-grid">
      <div v-for="g in groups" :key="g.id" class="group-card" @click="router.push(`/group/${g.id}`)">
        <h3>{{ g.name }}</h3>
        <div class="meta">
          {{ g.tags.join(' · ') || '搭子群' }} · {{ g.regionName }}
          <span v-if="g.memberCount"> · {{ g.memberCount }}人</span>
        </div>
      </div>
    </div>
    <div v-if="!loading && groups.length === 0" style="text-align:center;color:#969799;padding:32px;">
      当前地区暂无群，请联系客服
    </div>
  </div>
</template>

<style scoped>
.tab {
  border: none; background: #fff; padding: 8px 14px; border-radius: 999px; white-space: nowrap; cursor: pointer;
}
.tab.active { background: #667eea; color: #fff; }
</style>
