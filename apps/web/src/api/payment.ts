import api, { type Product } from './index';
import { invokeWechatPay, isWechatBrowser, sleep } from '@/utils/wechat-pay';

export interface PublicConfig {
  paymentTestMode: boolean;
  paymentTestAmount: number;
  paymentUseMock: boolean;
  wechatPayEnabled: boolean;
}

export interface PrepayResult {
  mock?: boolean;
  orderNo: string;
  needOAuth?: boolean;
  oauthUrl?: string;
  scene?: string;
  h5Url?: string;
  appId?: string;
  timeStamp?: string;
  nonceStr?: string;
  package?: string;
  signType?: string;
  paySign?: string;
  hint?: string;
}

export interface OrderInfo {
  orderNo: string;
  payStatus: number;
}

export async function fetchPublicConfig() {
  return api.get('/config/public') as Promise<PublicConfig>;
}

export async function wechatPrepay(orderNo: string, scene: 'jsapi' | 'h5', returnUrl?: string) {
  return api.post('/payments/wechat/prepay', { orderNo, scene, returnUrl }) as Promise<PrepayResult>;
}

export async function mockPay(orderNo: string) {
  return api.post('/payments/wechat/mock-pay', { orderNo, scene: 'mock' });
}

export async function fetchOrderByNo(orderNo: string) {
  return api.get(`/orders/by-no/${orderNo}`) as Promise<OrderInfo>;
}

export async function getWechatBindUrl(returnUrl: string) {
  return api.post('/auth/wechat/bind-url', { returnUrl }) as Promise<{ url: string }>;
}

/** 展示价：测试阶段显示 0.01 */
export function displayPrice(product: Product, config: PublicConfig | null) {
  if (config?.paymentTestMode) return config.paymentTestAmount;
  return product.price;
}

export async function payOrder(orderNo: string, returnUrl?: string): Promise<void> {
  const scene = isWechatBrowser() ? 'jsapi' : 'h5';
  const safeReturnUrl =
    returnUrl ?? `${window.location.origin}${window.location.pathname}`;
  let prepay = await wechatPrepay(orderNo, scene, safeReturnUrl);

  if (prepay.mock) {
    await mockPay(orderNo);
    return;
  }

  if (prepay.needOAuth && prepay.oauthUrl) {
    const { url } = await getWechatBindUrl(safeReturnUrl);
    window.location.href = url;
    return;
  }

  if (scene === 'h5' && prepay.h5Url) {
    window.location.href = prepay.h5Url;
    return;
  }

  if (scene === 'jsapi' && prepay.appId && prepay.paySign) {
    await invokeWechatPay({
      appId: prepay.appId,
      timeStamp: prepay.timeStamp!,
      nonceStr: prepay.nonceStr!,
      package: prepay.package!,
      signType: prepay.signType || 'RSA',
      paySign: prepay.paySign,
    });
    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      const order = await fetchOrderByNo(orderNo);
      if (order.payStatus === 1) return;
    }
    throw new Error('支付结果确认中，请稍后刷新页面');
  }

  throw new Error('无法发起支付，请检查微信支付配置');
}

// re-export api helpers used by views
export {
  createOrder,
  fetchProducts,
  fetchGroupDetail,
  fetchQrcode,
  fetchRegions,
  fetchGroups,
  sendSms,
  loginSms,
  trackAttribution,
  type Product,
  type GroupDetail,
  type GroupItem,
} from './index';

export default api;
