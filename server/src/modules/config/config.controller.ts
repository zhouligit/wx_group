import { Controller, Get } from '@nestjs/common';
import { ok } from '../../common/response';

@Controller('config')
export class ConfigController {
  @Get('public')
  publicConfig() {
    const testMode = process.env.PAYMENT_TEST_MODE === 'true';
    const testAmount = Number(process.env.PAYMENT_TEST_AMOUNT || '0.01');
    const useMock = process.env.PAYMENT_USE_MOCK === 'true';
    return ok({
      paymentTestMode: testMode,
      paymentTestAmount: testAmount,
      paymentUseMock: useMock,
      wechatPayEnabled: !useMock && !!process.env.WECHAT_MCH_ID,
    });
  }
}
