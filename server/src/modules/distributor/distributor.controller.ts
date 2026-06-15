import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsNumber, Min } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ok } from '../../common/response';
import { DistributorService } from './distributor.service';

type AuthRequest = Request & { user: { id: bigint } };

class WithdrawDto {
  @IsNumber()
  @Min(50)
  amount!: number;

  accountInfo!: Record<string, unknown>;
}

@Controller('distributor')
export class DistributorController {
  constructor(private distributorService: DistributorService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthRequest) {
    return ok(await this.distributorService.getMe(req.user.id));
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  async apply(@Req() req: AuthRequest) {
    return ok(await this.distributorService.apply(req.user.id));
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async stats(@Req() req: AuthRequest) {
    return ok(await this.distributorService.stats(req.user.id));
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async withdraw(@Req() req: AuthRequest, @Body() dto: WithdrawDto) {
    return ok(await this.distributorService.withdraw(req.user.id, dto));
  }
}
