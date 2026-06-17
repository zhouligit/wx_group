import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createSign, createDecipheriv, randomUUID } from 'crypto';
import { readFileSync } from 'fs';

export interface JsapiPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA';
  paySign: string;
}

@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);

  isConfigured(): boolean {
    return !!(
      process.env.WECHAT_APP_ID &&
      process.env.WECHAT_MCH_ID &&
      process.env.WECHAT_API_V3_KEY &&
      process.env.WECHAT_SERIAL_NO &&
      (process.env.WECHAT_PRIVATE_KEY || process.env.WECHAT_PRIVATE_KEY_PATH)
    );
  }

  get appId() {
    return process.env.WECHAT_APP_ID ?? '';
  }

  private get mchId() {
    return process.env.WECHAT_MCH_ID ?? '';
  }

  private get apiV3Key() {
    return process.env.WECHAT_API_V3_KEY ?? '';
  }

  private get serialNo() {
    return process.env.WECHAT_SERIAL_NO ?? '';
  }

  private get notifyUrl() {
    return process.env.WECHAT_NOTIFY_URL ?? '';
  }

  private getPrivateKey(): string {
    if (process.env.WECHAT_PRIVATE_KEY) {
      return process.env.WECHAT_PRIVATE_KEY.replace(/\\n/g, '\n');
    }
    const path = process.env.WECHAT_PRIVATE_KEY_PATH;
    if (path) return readFileSync(path, 'utf8');
    throw new InternalServerErrorException('WECHAT_PRIVATE_KEY_NOT_CONFIGURED');
  }

  private sign(message: string): string {
    const signer = createSign('RSA-SHA256');
    signer.update(message);
    signer.end();
    return signer.sign(this.getPrivateKey(), 'base64');
  }

  private buildAuthorization(method: string, urlPath: string, body: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomUUID().replace(/-/g, '');
    const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = this.sign(message);
    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.serialNo}"`;
  }

  private async request<T>(method: string, urlPath: string, body?: object): Promise<T> {
    const bodyStr = body ? JSON.stringify(body) : '';
    const res = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: this.buildAuthorization(method, urlPath, bodyStr),
        'User-Agent': 'wx-group-server',
      },
      body: body ? bodyStr : undefined,
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    if (text) {
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        throw new InternalServerErrorException(`WECHAT_PAY_INVALID_RESPONSE: ${text.slice(0, 200)}`);
      }
    }
    if (!res.ok) {
      const code = json.code as string | undefined;
      const message = (json.message as string) || `WECHAT_PAY_HTTP_${res.status}`;
      this.logger.error(`WeChat Pay ${method} ${urlPath} failed: ${code ?? ''} ${message}`);
      throw new InternalServerErrorException(
        code ? `WECHAT_PAY: ${message} (${code})` : `WECHAT_PAY: ${message}`,
      );
    }
    return json as T;
  }

  /** 元 → 分 */
  amountToFen(amountYuan: number): number {
    return Math.round(amountYuan * 100);
  }

  async createJsapiPrepay(params: {
    orderNo: string;
    description: string;
    amountYuan: number;
    openid: string;
  }): Promise<JsapiPayParams> {
    const path = '/v3/pay/transactions/jsapi';
    const body = {
      appid: this.appId,
      mchid: this.mchId,
      description: params.description,
      out_trade_no: params.orderNo,
      notify_url: this.notifyUrl,
      amount: {
        total: this.amountToFen(params.amountYuan),
        currency: 'CNY',
      },
      payer: { openid: params.openid },
    };
    const result = await this.request<{ prepay_id: string }>('POST', path, body);
    return this.buildJsapiParams(result.prepay_id);
  }

  async createH5Prepay(params: {
    orderNo: string;
    description: string;
    amountYuan: number;
    clientIp: string;
  }): Promise<{ h5Url: string }> {
    const path = '/v3/pay/transactions/h5';
    const body = {
      appid: this.appId,
      mchid: this.mchId,
      description: params.description,
      out_trade_no: params.orderNo,
      notify_url: this.notifyUrl,
      amount: {
        total: this.amountToFen(params.amountYuan),
        currency: 'CNY',
      },
      scene_info: {
        payer_client_ip: params.clientIp || '127.0.0.1',
        h5_info: { type: 'Wap' },
      },
    };
    const result = await this.request<{ h5_url: string }>('POST', path, body);
    return { h5Url: result.h5_url };
  }

  buildJsapiParams(prepayId: string): JsapiPayParams {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = randomUUID().replace(/-/g, '');
    const packageStr = `prepay_id=${prepayId}`;
    const message = `${this.appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
    return {
      appId: this.appId,
      timeStamp,
      nonceStr,
      package: packageStr,
      signType: 'RSA',
      paySign: this.sign(message),
    };
  }

  decryptNotifyResource(resource: {
    ciphertext: string;
    associated_data?: string;
    nonce: string;
  }): { out_trade_no: string; transaction_id: string; trade_state: string } {
    const key = Buffer.from(this.apiV3Key, 'utf8');
    const nonce = Buffer.from(resource.nonce, 'utf8');
    const buf = Buffer.from(resource.ciphertext, 'base64');
    const authTag = buf.subarray(buf.length - 16);
    const data = buf.subarray(0, buf.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    if (resource.associated_data) {
      decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
    }
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return JSON.parse(plain);
  }
}
