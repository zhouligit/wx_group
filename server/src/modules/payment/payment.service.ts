import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async createPrepay(userId: bigint, orderNo: string, scene: string) {
    const order = await this.prisma.order.findFirst({ where: { orderNo, userId } });
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    if (order.payStatus !== 0) throw new BadRequestException('ORDER_NOT_PAYABLE');

    if (scene === 'mock' || process.env.NODE_ENV === 'development') {
      return {
        mock: true,
        orderNo,
        hint: '开发环境请调用 POST /payments/wechat/mock-pay',
      };
    }

    return { orderNo, scene, h5Url: null };
  }

  async createCommission(orderId: bigint) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });
    if (!order?.distId || order.payStatus !== 1) return;

    const rate =
      order.product.skuCode === 'UNLOCK' ||
      ['MONTH', 'QUARTER', 'YEAR'].includes(order.product.skuCode)
        ? 0.3
        : 0.15;
    const amount = Number(order.amount) * rate;
    const settleAt = new Date(Date.now() + 7 * 86400000);

    await this.prisma.commission.create({
      data: {
        distId: order.distId,
        orderId: order.id,
        amount,
        rate,
        settleAt,
      },
    });
  }
}
