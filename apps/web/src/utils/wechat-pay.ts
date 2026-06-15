export function isWechatBrowser(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent);
}

export interface WechatJsapiPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

declare global {
  interface Window {
    WeixinJSBridge?: {
      invoke: (
        name: string,
        params: Record<string, string>,
        cb: (res: { err_msg?: string }) => void,
      ) => void;
    };
  }
}

export function invokeWechatPay(params: WechatJsapiPayParams): Promise<void> {
  return new Promise((resolve, reject) => {
    const pay = () => {
      window.WeixinJSBridge!.invoke(
        'getBrandWCPayRequest',
        {
          appId: params.appId,
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType,
          paySign: params.paySign,
        },
        (res) => {
          if (res.err_msg === 'get_brand_wcpay_request:ok') resolve();
          else reject(new Error(res.err_msg || '支付取消'));
        },
      );
    };
    if (typeof window.WeixinJSBridge === 'undefined') {
      document.addEventListener('WeixinJSBridgeReady', pay, { once: true });
    } else {
      pay();
    }
  });
}

export async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
