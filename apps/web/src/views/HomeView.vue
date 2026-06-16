<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchGroups, fetchRegions, searchRegions, type GroupItem, type RegionSearchItem } from '@/api';

const router = useRouter();
const regions = ref<{ id: number; name: string }[]>([]);
const activeRegionId = ref<number | null>(null);
const cityKeyword = ref('');
const filterLabel = ref('');
const groups = ref<GroupItem[]>([]);
const loading = ref(false);

const searchText = ref('');
const searchResults = ref<RegionSearchItem[]>([]);
const searchLoading = ref(false);
const showSearchResults = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function loadGroups() {
  loading.value = true;
  try {
    const data = (await fetchGroups({
      page: 1,
      pageSize: 100,
      regionId: activeRegionId.value ?? undefined,
      hot: activeRegionId.value === null && !cityKeyword.value,
      keyword: cityKeyword.value || undefined,
    })) as { list: GroupItem[] };
    groups.value = data.list;
  } finally {
    loading.value = false;
  }
}

function selectRegion(id: number | null, label = '') {
  activeRegionId.value = id;
  cityKeyword.value = '';
  filterLabel.value = id === null ? '热门群' : label;
  searchText.value = '';
  showSearchResults.value = false;
  loadGroups();
}

function selectSearchItem(item: RegionSearchItem) {
  activeRegionId.value = item.provinceId;
  cityKeyword.value = item.cityKeyword ?? '';
  filterLabel.value = item.label;
  searchText.value = item.label;
  showSearchResults.value = false;
  loadGroups();
}

function onSearchInput(val: string) {
  searchText.value = val;
  if (searchTimer) clearTimeout(searchTimer);
  if (!val.trim()) {
    searchResults.value = [];
    showSearchResults.value = false;
    return;
  }
  searchTimer = setTimeout(async () => {
    searchLoading.value = true;
    showSearchResults.value = true;
    try {
      searchResults.value = await searchRegions(val.trim());
    } finally {
      searchLoading.value = false;
    }
  }, 300);
}

function clearSearch() {
  searchText.value = '';
  searchResults.value = [];
  showSearchResults.value = false;
  selectRegion(null);
}

onMounted(async () => {
  regions.value = (await fetchRegions()) as { id: number; name: string }[];
  filterLabel.value = '热门群';
  await loadGroups();
});
</script>

<template>
  <div>
    <div class="slogan">
      <div style="font-size:18px;font-weight:600;">搭子式交友 · 摆脱传统交友概念！</div>
      <div style="font-size:13px;opacity:.9;margin-top:6px;">加群失败请联系客服</div>
    </div>

    <div class="search-wrap">
      <van-search
        v-model="searchText"
        placeholder="搜索省份或城市，如 广东、广州"
        shape="round"
        show-action
        @update:model-value="onSearchInput"
        @search="onSearchInput"
        @focus="showSearchResults = searchText.trim().length > 0"
      >
        <template #action>
          <div @click="clearSearch">重置</div>
        </template>
      </van-search>

      <div v-if="showSearchResults" class="search-results">
        <div v-if="searchLoading" class="search-hint">搜索中...</div>
        <div v-else-if="searchResults.length === 0" class="search-hint">未找到相关地区</div>
        <button
          v-for="item in searchResults"
          :key="`${item.level}-${item.id}`"
          type="button"
          class="search-item"
          @click="selectSearchItem(item)"
        >
          <span class="search-item-name">{{ item.name }}</span>
          <span v-if="item.level === 2" class="search-item-sub">{{ item.provinceName }}</span>
          <span v-else class="search-item-sub">省级</span>
        </button>
      </div>
    </div>

    <div v-if="filterLabel && filterLabel !== '热门群'" class="filter-bar">
      当前：{{ filterLabel }}
    </div>

    <div class="tabs-wrap">
      <button class="tab" :class="{ active: activeRegionId === null && !cityKeyword }" @click="selectRegion(null)">
        热门群
      </button>
      <button
        v-for="r in regions"
        :key="r.id"
        class="tab"
        :class="{ active: activeRegionId === r.id && !cityKeyword }"
        @click="selectRegion(r.id, r.name)"
      >
        {{ r.name }}
      </button>
    </div>

    <div v-if="loading" style="text-align:center;padding:24px;">加载中...</div>
    <div v-else class="group-grid">
      <div v-for="g in groups" :key="g.id" class="group-card" @click="router.push(`/group/${g.id}`)">
        <h3>{{ g.name }}</h3>
        <div class="meta">
          {{ g.tags.join(' · ') || '搭子群' }}
          <span v-if="g.cityName"> · {{ g.cityName }}</span>
          <span v-else-if="g.regionName"> · {{ g.regionName }}</span>
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
.search-wrap {
  position: relative;
  margin-bottom: 8px;
}
.search-results {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  z-index: 20;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  max-height: 280px;
  overflow-y: auto;
}
.search-hint {
  padding: 16px;
  text-align: center;
  color: #969799;
  font-size: 13px;
}
.search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: #fff;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  text-align: left;
}
.search-item:active {
  background: #f7f8fa;
}
.search-item-name {
  font-size: 15px;
  color: #323233;
}
.search-item-sub {
  font-size: 12px;
  color: #969799;
}
.filter-bar {
  font-size: 13px;
  color: #667eea;
  margin-bottom: 8px;
}
.tabs-wrap {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 12px;
  padding-bottom: 4px;
}
.tab {
  border: none;
  background: #fff;
  padding: 8px 14px;
  border-radius: 999px;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}
.tab.active {
  background: #667eea;
  color: #fff;
}
</style>
