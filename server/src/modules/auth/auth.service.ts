import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WechatOAuthService } from '../../wechat/wechat-oauth.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwt: JwtService,
    private wechatOAuth: WechatOAuthService,
  ) {}

  async sendSmsCode(phone: string) {
    const code = process.env.SMS_MOCK === 'true' ? '123456' : String(Math.floor(100000 + Math.random() * 900000));
    await this.redis.getClient().set(`sms:${phone}`, code, 'EX', 300);
    return { phone, mock: process.env.SMS_MOCK === 'true' };
  }

  async loginBySms(phone: string, code: string) {
    const cached = await this.redis.getClient().get(`sms:${phone}`);
    if (!cached || cached !== code) {
      throw new UnauthorizedException('INVALID_CODE');
    }
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, nickname: `用户${phone.slice(-4)}` },
      });
    }
    const token = this.signToken(user.id);
    return { token, user: this.toProfile(user) };
  }

  async getWechatBindUrl(userId: bigint, returnUrl: string) {
    return this.getWechatOAuthUrl(returnUrl, userId);
  }

  async getWechatOAuthUrl(returnUrl: string, userId?: bigint) {
    if (!this.wechatOAuth.isConfigured()) {
      throw new BadRequestException('WECHAT_OAUTH_NOT_CONFIGURED');
    }
    const url = await this.wechatOAuth.createOAuthUrl(returnUrl, userId);
    return { url };
  }

  async handleWechatCallback(code: string, state: string) {
    const { openid, state: oauthState } = await this.wechatOAuth.exchangeCode(code, state);
    if (oauthState.userId) {
      const userId = BigInt(oauthState.userId);
      const existing = await this.prisma.user.findUnique({ where: { openid } });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('OPENID_BOUND_TO_OTHER_USER');
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: { openid },
      });
      return { returnUrl: oauthState.returnUrl, bound: true };
    }

    let user = await this.prisma.user.findUnique({ where: { openid } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { openid, nickname: `微信用户${openid.slice(-4)}` },
      });
    }
    const token = this.signToken(user.id);
    const returnUrl = oauthState.returnUrl || '/';
    const sep = returnUrl.includes('?') ? '&' : '?';
    return {
      returnUrl: `${returnUrl}${sep}token=${encodeURIComponent(token)}`,
      bound: false,
      token,
    };
  }

  signToken(userId: bigint) {
    return this.jwt.sign({ sub: userId.toString() });
  }

  toProfile(user: {
    id: bigint;
    nickname: string | null;
    avatar: string | null;
    phone: string | null;
    openid?: string | null;
  }) {
    return {
      id: Number(user.id),
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      hasOpenid: !!user.openid,
      hasMembership: false,
      membershipExpireAt: null,
    };
  }
}
