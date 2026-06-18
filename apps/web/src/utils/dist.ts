import { trackAttribution } from '@/api';

const COOKIE_NAME = 'dist_code';

export function getDistCodeFromCookie(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** 登录后绑定分销商（读 cookie 中的邀请码） */
export async function bindDistIfNeeded(): Promise<void> {
  const code = getDistCodeFromCookie();
  if (!code) return;
  try {
    await trackAttribution(code);
  } catch {
    // 无效邀请码等忽略
  }
}
