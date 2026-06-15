import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';

interface OAuthState {
  returnUrl: string;
  userId?: string;
}

@Injectable()
export class WechatOAuthService {
  constructor(private redis: RedisService) {}

  isConfigured(): boolean {
    return !!(process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET);
  }

  get appId() {
    return process.env.WECHAT_APP_ID ?? '';
  }

  private get appSecret() {
    return process.env.WECHAT_APP_SECRET ?? '';
  }

  private get callbackUrl() {
    const base = process.env.WEB_BASE_URL || 'http://localhost:5173';
    return `${base.replace(/\/$/, '')}/api/v1/auth/wechat/callback`;
  }

  async createOAuthUrl(returnUrl: string, userId?: bigint): Promise<string> {
    const state = randomUUID().replace(/-/g, '');
    const payload: OAuthState = {
      returnUrl: returnUrl || '/',
      userId: userId?.toString(),
    };
    await this.redis.getClient().set(`wx:oauth:${state}`, JSON.stringify(payload), 'EX', 600);
    const redirectUri = encodeURIComponent(this.callbackUrl);
    return (
      `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${this.appId}` +
      `&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${state}#wechat_redirect`
    );
  }

  async exchangeCode(code: string, state: string): Promise<{ openid: string; state: OAuthState }> {
    const raw = await this.redis.getClient().get(`wx:oauth:${state}`);
    if (!raw) throw new InternalServerErrorException('OAUTH_STATE_EXPIRED');
    await this.redis.getClient().del(`wx:oauth:${state}`);
    const oauthState = JSON.parse(raw) as OAuthState;

    const url =
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.appId}` +
      `&secret=${this.appSecret}&code=${code}&grant_type=authorization_code`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      openid?: string;
      errcode?: number;
      errmsg?: string;
    };
    if (!data.openid) {
      throw new InternalServerErrorException(data.errmsg || 'WECHAT_OAUTH_FAILED');
    }
    return { openid: data.openid, state: oauthState };
  }
}
