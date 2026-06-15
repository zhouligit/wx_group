import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { IsString, Length, Matches } from 'class-validator';
import { Response } from 'express';
import { ok } from '../../common/response';
import { AuthService } from './auth.service';

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

  @Get('wechat/redirect')
  wechatRedirect(@Query('returnUrl') returnUrl: string, @Res() res: Response) {
    // TODO: 接入微信 OAuth
    res.redirect(returnUrl || '/');
  }

  @Get('wechat/callback')
  wechatCallback(@Query('code') _code: string, @Res() res: Response) {
    // TODO: 接入微信 OAuth
    res.redirect('/');
  }
}
