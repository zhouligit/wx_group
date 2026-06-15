import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
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
    const data = await this.paymentService.createPrepay(req.user.id, dto.orderNo, dto.scene);
    return ok(data);
  }

  @Post('notify')
  async notify(@Body() body: { orderNo?: string; transactionId?: string }) {
    const order = await this.orderService.markPaid(
      body.orderNo ?? '',
      body.transactionId ?? 'mock-tx',
    );
    if (order) {
      await this.membershipService.grantFromOrder(order.id);
      await this.paymentService.createCommission(order.id);
    }
    return { code: 'SUCCESS', message: 'OK' };
  }

  @Post('mock-pay')
  @UseGuards(JwtAuthGuard)
  async mockPay(@Body() dto: PrepayDto) {
    const order = await this.orderService.markPaid(dto.orderNo, `mock-${Date.now()}`);
    if (order) {
      await this.membershipService.grantFromOrder(order.id);
      await this.paymentService.createCommission(order.id);
    }
    return ok({ paid: true, orderNo: dto.orderNo });
  }
}
