import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MembershipService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: bigint) {
    const now = new Date();
    const membership = await this.prisma.membership.findFirst({
      where: { userId, status: 1, expireAt: { gt: now } },
      orderBy: { expireAt: 'desc' },
    });
    const unlocks = await this.prisma.groupUnlock.findMany({ where: { userId } });
    return {
      active: !!membership,
      type: membership?.type ?? null,
      expireAt: membership?.expireAt.toISOString() ?? null,
      unlockedGroupIds: unlocks.map((u) => Number(u.groupId)),
    };
  }

  async grantFromOrder(orderId: bigint) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });
    if (!order || order.payStatus !== 1) return;

    const sku = order.product.skuCode;
    if (sku === 'UNLOCK' && order.groupId) {
      await this.prisma.groupUnlock.upsert({
        where: {
          userId_groupId: { userId: order.userId, groupId: order.groupId },
        },
        create: {
          userId: order.userId,
          groupId: order.groupId,
          orderId: order.id,
        },
        update: {},
      });
      return;
    }

    const days = order.product.durationDays ?? 30;
    const startAt = new Date();
    const expireAt = new Date(startAt.getTime() + days * 86400000);
    await this.prisma.membership.create({
      data: {
        userId: order.userId,
        type: sku.toLowerCase(),
        orderId: order.id,
        startAt,
        expireAt,
      },
    });
  }
}
