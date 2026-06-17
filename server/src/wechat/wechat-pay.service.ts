import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { createDecipheriv, createPrivateKey, randomBytes, sign as cryptoSign } from 'crypto';
import { existsSync, readFileSync } from 'fs';

export interface JsapiPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA';
  paySign: string;
}

/** 与 wander_meet json.dumps(separators=(",", ":")) 一致 */
function compactJson(body: object): string {
  return JSON.stringify(body);
}

@Injectable()
export class WechatPayService implements OnModuleInit {
  private readonly logger = new Logger(WechatPayService.name);
  private privateKeyPem: string | null = null;

  onModuleInit() {
    this.validateAtStartup();
  }

  isConfigured(): boolean {
    return !!(
      process.env.WECHAT_APP_ID?.trim() &&
      process.env.WECHAT_MCH_ID?.trim() &&
      process.env.WECHAT_API_V3_KEY?.trim() &&
      process.env.WECHAT_SERIAL_NO?.trim() &&
      (process.env.WECHAT_PRIVATE_KEY?.trim() || process.env.WECHAT_PRIVATE_KEY_PATH?.trim())
    );
  }

  get appId() {
    return process.env.WECHAT_APP_ID?.trim() ?? '';
  }

  private get mchId() {
    return process.env.WECHAT_MCH_ID?.trim() ?? '';
  }

  private get apiV3Key() {
    return process.env.WECHAT_API_V3_KEY?.trim() ?? '';
  }

  private get serialNo() {
    return process.env.WECHAT_SERIAL_NO?.trim() ?? '';
  }

  private get notifyUrl() {
    return process.env.WECHAT_NOTIFY_URL?.trim() ?? '';
  }

  /** 与 wander_meet 相同：优先 WECHAT_PRIVATE_KEY 正文，否则读 PATH 文件 */
  private loadPrivateKeyPem(): string {
    if (this.privateKeyPem) return this.privateKeyPem;

    let pem = (process.env.WECHAT_PRIVATE_KEY ?? '').trim().replace(/\\n/g, '\n');
    const path = process.env.WECHAT_PRIVATE_KEY_PATH?.trim();
    if (!pem && path) {
      if (!existsSync(path)) {
        throw new InternalServerErrorException(`WECHAT_PRIVATE_KEY_PATH_NOT_FOUND: ${path}`);
      }
      pem = readFileSync(path, 'utf8');
    }
    pem = pem.trim();
    if (!pem) {
      throw new InternalServerErrorException('WECHAT_PRIVATE_KEY_NOT_CONFIGURED');
    }
    this.privateKeyPem = pem;
    return pem;
  }

  private sign(message: string): string {
    const key = createPrivateKey(this.loadPrivateKeyPem());
    return cryptoSign('RSA-SHA256', Buffer.from(message, 'utf8'), key).toString('base64');
  }

  /** 启动时校验，便于排查 SIGN_ERROR */
  validateAtStartup(): void {
    if (!this.isConfigured()) return;
    const keySource = (process.env.WECHAT_PRIVATE_KEY ?? '').trim()
      ? 'env:WECHAT_PRIVATE_KEY'
      : `file:${process.env.WECHAT_PRIVATE_KEY_PATH?.trim()}`;
    try {
      this.loadPrivateKeyPem();
      this.logger.log(
        `WeChat Pay ready mchId=${this.mchId} appId=${this.appId} serial=${this.serialNo} key=${keySource}`,
      );
    } catch (e) {
      this.logger.error(`WeChat Pay 配置无效: ${(e as Error).message}`);
    }
  }

  private buildAuthorization(method: string, urlPath: string, body: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');
    const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = this.sign(message);
    return (
      `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",` +
      `nonce_str="${nonce}",signature="${signature}",` +
      `timestamp="${timestamp}",serial_no="${this.serialNo}"`
    );
  }

  private async request<T>(method: string, urlPath: string, body?: object): Promise<T> {
    const bodyStr = body ? compactJson(body) : '';
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
      this.logger.error(
        `WeChat Pay ${method} ${urlPath} failed: ${code ?? ''} ${message} serial=${this.serialNo}`,
      );
      throw new InternalServerErrorException(
        code ? `WECHAT_PAY: ${message} (${code})` : `WECHAT_PAY: ${message}`,
      );
    }
    return json as T;
  }

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
    const nonceStr = randomBytes(16).toString('hex');
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
