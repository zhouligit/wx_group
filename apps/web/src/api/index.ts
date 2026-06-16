import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body.code !== 0) return Promise.reject(new Error(body.message || '请求失败'));
    return body.data;
  },
  (err) => Promise.reject(err),
);

export default api;

export interface GroupItem {
  id: number;
  name: string;
  coverUrl?: string | null;
  regionName: string;
  cityName?: string;
  tags: string[];
  memberCount?: number | null;
  status: number;
}

export interface GroupDetail extends GroupItem {
  description?: string | null;
  qrcodeLocked: boolean;
}

export interface Product {
  id: number;
  skuCode: string;
  name: string;
  price: number;
  durationDays?: number | null;
}

export async function fetchRegions() {
  return api.get('/regions', { params: { level: 1 } });
}

export async function fetchGroups(params: { page?: number; pageSize?: number; regionId?: number; hot?: boolean }) {
  return api.get('/groups', { params });
}

export async function fetchGroupDetail(id: number) {
  return api.get(`/groups/${id}`);
}

export async function fetchQrcode(id: number) {
  return api.get(`/groups/${id}/qrcode`);
}

export async function fetchProducts() {
  return api.get('/products');
}

export async function sendSms(phone: string) {
  return api.post('/auth/sms/send', { phone });
}

export async function loginSms(phone: string, code: string) {
  return api.post('/auth/sms/login', { phone, code });
}

export async function createOrder(productId: number, groupId?: number) {
  return api.post('/orders', { productId, groupId });
}

export async function mockPay(orderNo: string) {
  return api.post('/payments/wechat/mock-pay', { orderNo, scene: 'mock' });
}

export async function trackAttribution(inviteCode: string) {
  return api.post('/attribution/track', { inviteCode });
}
