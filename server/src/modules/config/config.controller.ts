import { Controller, Get } from '@nestjs/common';
import { ok } from '../../common/response';

@Controller('config')
export class ConfigController {
  @Get('public')
  publicConfig() {
    const testMode = process.env.PAYMENT_TEST_MODE === 'true';
    const testAmount = Number(process.env.PAYMENT_TEST_AMOUNT || '0.01');
    const useMock = process.env.PAYMENT_USE_MOCK === 'true';
    const base = (process.env.WEB_BASE_URL || '').replace(/\/$/, '');
    const wechatPayConfigured = !!(
      process.env.WECHAT_APP_ID &&
      process.env.WECHAT_MCH_ID &&
      process.env.WECHAT_API_V3_KEY &&
      process.env.WECHAT_SERIAL_NO &&
      (process.env.WECHAT_PRIVATE_KEY || process.env.WECHAT_PRIVATE_KEY_PATH)
    );
    return ok({
      paymentTestMode: testMode,
      paymentTestAmount: testAmount,
      paymentUseMock: useMock,
      wechatPayEnabled: !useMock && wechatPayConfigured,
      wechatPayConfigured,
      /** 须与公众号「网页授权域名」一致，报错 10003 时核对此字段 */
      wechatOAuthCallbackUrl: base ? `${base}/api/v1/auth/wechat/callback` : null,
    });
  }
}
