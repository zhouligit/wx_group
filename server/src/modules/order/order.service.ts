import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  private genOrderNo() {
    return `WX${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }

  /** 测试阶段统一按 0.01 元下单 */
  resolvePayAmount(productPrice: number): number {
    if (process.env.PAYMENT_TEST_MODE === 'true') {
      return Number(process.env.PAYMENT_TEST_AMOUNT || '0.01');
    }
    return productPrice;
  }

  async create(userId: bigint, dto: { productId: number; groupId?: number }) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(dto.productId) },
    });
    if (!product || product.enabled !== 1) {
      throw new BadRequestException('INVALID_PRODUCT');
    }
    if (product.skuCode !== 'UNLOCK') {
      throw new BadRequestException('MEMBERSHIP_DISABLED');
    }
    if (!dto.groupId) {
      throw new BadRequestException('GROUP_ID_REQUIRED');
    }
    const unlocked = await this.prisma.groupUnlock.findUnique({
      where: {
        userId_groupId: { userId, groupId: BigInt(dto.groupId) },
      },
    });
    if (unlocked) {
      throw new BadRequestException('ALREADY_UNLOCKED');
    }

    const relation = await this.prisma.distRelation.findUnique({ where: { userId } });
    const amount = this.resolvePayAmount(Number(product.price));

    const order = await this.prisma.order.create({
      data: {
        orderNo: this.genOrderNo(),
        userId,
        productId: product.id,
        groupId: dto.groupId ? BigInt(dto.groupId) : null,
        amount,
        distId: relation?.distId ?? null,
      },
      include: { product: true },
    });

    return {
      id: Number(order.id),
      orderNo: order.orderNo,
      productId: Number(order.productId),
      groupId: order.groupId ? Number(order.groupId) : null,
      amount: Number(order.amount),
      productName: order.product.name,
      payStatus: order.payStatus,
      paidAt: order.paidAt,
    };
  }

  async detail(userId: bigint, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: BigInt(id), userId },
    });
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    return this.toDto(order);
  }

  async detailByNo(userId: bigint, orderNo: string) {
    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId },
    });
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    return this.toDto(order);
  }

  private toDto(order: {
    id: bigint;
    orderNo: string;
    productId: bigint;
    groupId: bigint | null;
    amount: { toNumber?: () => number } | number;
    payStatus: number;
    paidAt: Date | null;
  }) {
    return {
      id: Number(order.id),
      orderNo: order.orderNo,
      productId: Number(order.productId),
      groupId: order.groupId ? Number(order.groupId) : null,
      amount: Number(order.amount),
      payStatus: order.payStatus,
      paidAt: order.paidAt,
    };
  }

  async markPaid(orderNo: string, wxTransactionId: string, payChannel = 'wechat') {
    const order = await this.prisma.order.findUnique({ where: { orderNo } });
    if (!order || order.payStatus === 1) return order;
    return this.prisma.order.update({
      where: { orderNo },
      data: {
        payStatus: 1,
        paidAt: new Date(),
        wxTransactionId,
        payChannel,
      },
    });
  }
}
