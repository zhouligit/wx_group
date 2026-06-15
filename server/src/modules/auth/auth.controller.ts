import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ok } from '../../common/response';
import { AuthService } from './auth.service';

type AuthRequest = Request & { user: { id: bigint } };

class SendSmsDto {
  @IsString()
  @Matches(/^1\d{10}$/)
  phone!: string;
}

class SmsLoginDto {
  @IsString()
  @Matches(/^1\d{10}$/)
  phone!: string;

  @IsString()
  @Length(4, 6)
  code!: string;
}

class BindUrlDto {
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

class WechatRedirectQuery {
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sms/send')
  async sendSms(@Body() dto: SendSmsDto) {
    const data = await this.authService.sendSmsCode(dto.phone);
    return ok(data);
  }

  @Post('sms/login')
  async smsLogin(@Body() dto: SmsLoginDto) {
    const data = await this.authService.loginBySms(dto.phone, dto.code);
    return ok(data);
  }

  /** 已登录用户绑定 openid（JSAPI 支付前置） */
  @Post('wechat/bind-url')
  @UseGuards(JwtAuthGuard)
  async wechatBindUrl(@Req() req: AuthRequest, @Body() dto: BindUrlDto) {
    const data = await this.authService.getWechatBindUrl(req.user.id, dto.returnUrl || '/');
    return ok(data);
  }

  @Get('wechat/redirect')
  async wechatRedirect(@Query() query: WechatRedirectQuery, @Res() res: Response) {
    const { url } = await this.authService.getWechatOAuthUrl(query.returnUrl || '/');
    res.redirect(url);
  }

  @Get('wechat/callback')
  async wechatCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const result = await this.authService.handleWechatCallback(code, state);
    res.redirect(result.returnUrl);
  }
}
