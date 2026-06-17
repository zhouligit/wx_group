import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ok } from '../../common/response';
import { MembershipService } from '../membership/membership.service';
import { OrderService } from '../order/order.service';
import { PaymentService } from './payment.service';

type AuthRequest = Request & { user: { id: bigint } };

class PrepayDto {
  @IsString()
  orderNo!: string;

  @IsIn(['jsapi', 'h5', 'mock'])
  scene!: 'jsapi' | 'h5' | 'mock';

  @IsOptional()
  @IsString()
  @MaxLength(512)
  returnUrl?: string;
}

@Controller('payments/wechat')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private orderService: OrderService,
    private membershipService: MembershipService,
  ) {}

  @Post('prepay')
  @UseGuards(JwtAuthGuard)
  async prepay(@Req() req: AuthRequest, @Body() dto: PrepayDto) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const data = await this.paymentService.createPrepay(
      req.user.id,
      dto.orderNo,
      dto.scene,
      clientIp,
      dto.returnUrl,
    );
    return ok(data);
  }

  @Post('notify')
  async notify(@Req() req: Request & { rawBody?: Buffer }, @Body() body: unknown) {
    const result = await this.paymentService.handleWechatNotify(
      body as { resource?: { ciphertext: string; associated_data?: string; nonce: string } },
    );
    if (result.handled && result.orderNo) {
      const order = await this.orderService.markPaid(
        result.orderNo,
        result.transactionId ?? '',
        'wechat',
      );
      if (order) {
        await this.membershipService.grantFromOrder(order.id);
        await this.paymentService.createCommission(order.id);
      }
    }
    return { code: 'SUCCESS', message: 'OK' };
  }

  @Post('mock-pay')
  @UseGuards(JwtAuthGuard)
  async mockPay(@Body() dto: PrepayDto) {
    if (!this.paymentService.useMockPay() && process.env.PAYMENT_ALLOW_MOCK !== 'true') {
      return ok({ paid: false, message: '请使用微信支付' });
    }
    const order = await this.orderService.markPaid(dto.orderNo, `mock-${Date.now()}`, 'mock');
    if (order) {
      await this.membershipService.grantFromOrder(order.id);
      await this.paymentService.createCommission(order.id);
    }
    return ok({ paid: true, orderNo: dto.orderNo });
  }
}
