import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { loginSms, sendSms } from '@/api';
import { bindDistIfNeeded } from '@/utils/dist';

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '');
  const profile = ref<{ id: number; nickname?: string; phone?: string; hasMembership?: boolean } | null>(null);

  const isLoggedIn = computed(() => !!token.value);

  function setToken(t: string) {
    token.value = t;
    localStorage.setItem('token', t);
  }

  function logout() {
    token.value = '';
    profile.value = null;
    localStorage.removeItem('token');
  }

  async function sendCode(phone: string) {
    return sendSms(phone);
  }

  async function login(phone: string, code: string) {
    const data = await loginSms(phone, code) as { token: string; user: typeof profile.value };
    setToken(data.token);
    profile.value = data.user;
    await bindDistIfNeeded();
    return data;
  }

  async function syncDistBinding() {
    if (!token.value) return;
    await bindDistIfNeeded();
  }

  return { token, profile, isLoggedIn, setToken, logout, sendCode, login, syncDistBinding };
});
