import { Global, Module } from '@nestjs/common';
import { WechatOAuthService } from './wechat-oauth.service';
import { WechatPayService } from './wechat-pay.service';

@Global()
@Module({
  providers: [WechatPayService, WechatOAuthService],
  exports: [WechatPayService, WechatOAuthService],
})
export class WechatModule {}
