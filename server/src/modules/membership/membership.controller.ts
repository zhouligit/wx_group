import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ok } from '../../common/response';
import { MembershipService } from './membership.service';

type AuthRequest = Request & { user: { id: bigint } };

@Controller('membership')
export class MembershipController {
  constructor(private membershipService: MembershipService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@Req() req: AuthRequest) {
    const data = await this.membershipService.getStatus(req.user.id);
    return ok(data);
  }
}
