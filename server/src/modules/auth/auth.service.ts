import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwt: JwtService,
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

  signToken(userId: bigint) {
    return this.jwt.sign({ sub: userId.toString() });
  }

  toProfile(user: { id: bigint; nickname: string | null; avatar: string | null; phone: string | null }) {
    return {
      id: Number(user.id),
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      hasMembership: false,
      membershipExpireAt: null,
    };
  }
}
