import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ok } from '../../common/response';
import { MembershipService } from '../membership/membership.service';
import { PrismaService } from '../../prisma/prisma.service';

type AuthRequest = Request & { user: { id: bigint } };

@Controller('user')
export class UserController {
  constructor(
    private prisma: PrismaService,
    private membershipService: MembershipService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthRequest) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.id } });
    const membership = await this.membershipService.getStatus(req.user.id);
    return ok({
      id: Number(user!.id),
      nickname: user!.nickname,
      avatar: user!.avatar,
      phone: user!.phone,
      hasMembership: membership.active,
      membershipExpireAt: membership.expireAt,
    });
  }
}
