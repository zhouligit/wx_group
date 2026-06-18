import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type CommissionRow = {
  amount: unknown;
  status: number;
  orderId: bigint;
  createdAt: Date;
  rate: unknown;
};

function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 7) return phone ?? '—';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

@Injectable()
export class DistributorService {
  constructor(private prisma: PrismaService) {}

  private genCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  private async requireDistributor(userId: bigint) {
    const dist = await this.prisma.distributor.findUnique({ where: { userId } });
    if (!dist) throw new BadRequestException('NOT_DISTRIBUTOR');
    return dist;
  }

  async getMe(userId: bigint) {
    const dist = await this.prisma.distributor.findUnique({ where: { userId } });
    if (!dist) return null;
    const baseUrl = process.env.WEB_BASE_URL || 'http://localhost:5173';
    return {
      id: Number(dist.id),
      inviteCode: dist.inviteCode,
      status: dist.status,
      inviteUrl: `${baseUrl}/?d=${dist.inviteCode}`,
    };
  }

  async apply(userId: bigint) {
    const existing = await this.prisma.distributor.findUnique({ where: { userId } });
    if (existing) return { id: Number(existing.id), status: existing.status };

    const dist = await this.prisma.distributor.create({
      data: { userId, inviteCode: this.genCode(), status: 0 },
    });
    return { id: Number(dist.id), status: dist.status };
  }

  async stats(userId: bigint) {
    const dist = await this.requireDistributor(userId);

    const commissions = (await this.prisma.commission.findMany({
      where: { distId: dist.id },
    })) as CommissionRow[];
    const totalCommission = commissions.reduce(
      (s: number, c: CommissionRow) => s + Number(c.amount),
      0,
    );
    const pendingCommission = commissions
      .filter((c: CommissionRow) => c.status === 0)
      .reduce((s: number, c: CommissionRow) => s + Number(c.amount), 0);

    const totalVisits = await this.prisma.distRelation.count({ where: { distId: dist.id } });

    const paidOrders = await this.prisma.order.findMany({
      where: { distId: dist.id, payStatus: 1 },
      select: { userId: true, amount: true, paidAt: true },
    });
    const paidUserIds = new Set(paidOrders.map((o) => o.userId.toString()));
    const totalOrderAmount = paidOrders.reduce((s, o) => s + Number(o.amount), 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = paidOrders.filter((o) => o.paidAt && o.paidAt >= todayStart).length;

    return {
      todayVisits: 0,
      totalVisits,
      paidUsers: paidUserIds.size,
      todayOrders,
      totalOrders: paidOrders.length,
      totalOrderAmount,
      totalCommission,
      pendingCommission,
    };
  }

  async listReferrals(userId: bigint, page = 1, pageSize = 20) {
    const dist = await this.requireDistributor(userId);
    const skip = (page - 1) * pageSize;

    const [relations, total] = await Promise.all([
      this.prisma.distRelation.findMany({
        where: { distId: dist.id },
        include: { user: { select: { id: true, phone: true, nickname: true } } },
        orderBy: { bindAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.distRelation.count({ where: { distId: dist.id } }),
    ]);

    const userIds = relations.map((r) => r.userId);
    const paidByUser = new Map<
      string,
      { count: number; amount: number; lastPaidAt: Date | null; commission: number }
    >();

    if (userIds.length > 0) {
      const orders = await this.prisma.order.findMany({
        where: { distId: dist.id, userId: { in: userIds }, payStatus: 1 },
        select: { userId: true, amount: true, paidAt: true, id: true },
      });
      const orderIds = orders.map((o) => o.id);
      const comms =
        orderIds.length > 0
          ? await this.prisma.commission.findMany({
              where: { orderId: { in: orderIds } },
              select: { orderId: true, amount: true },
            })
          : [];
      const commByOrder = new Map(comms.map((c) => [c.orderId.toString(), Number(c.amount)]));

      for (const o of orders) {
        const key = o.userId.toString();
        const cur = paidByUser.get(key) ?? {
          count: 0,
          amount: 0,
          lastPaidAt: null as Date | null,
          commission: 0,
        };
        cur.count += 1;
        cur.amount += Number(o.amount);
        cur.commission += commByOrder.get(o.id.toString()) ?? 0;
        if (!cur.lastPaidAt || (o.paidAt && o.paidAt > cur.lastPaidAt)) {
          cur.lastPaidAt = o.paidAt;
        }
        paidByUser.set(key, cur);
      }
    }

    const list = relations.map((r) => {
      const paid = paidByUser.get(r.userId.toString());
      return {
        userId: Number(r.userId),
        phoneMasked: maskPhone(r.user.phone),
        nickname: r.user.nickname ?? null,
        bindAt: r.bindAt.toISOString(),
        hasPaid: !!paid && paid.count > 0,
        paidOrderCount: paid?.count ?? 0,
        paidAmount: paid?.amount ?? 0,
        commissionAmount: paid?.commission ?? 0,
        lastPaidAt: paid?.lastPaidAt?.toISOString() ?? null,
      };
    });

    return { list, total, page, pageSize };
  }

  async listCommissions(userId: bigint, page = 1, pageSize = 20) {
    const dist = await this.requireDistributor(userId);
    const skip = (page - 1) * pageSize;

    const [rows, total] = await Promise.all([
      this.prisma.commission.findMany({
        where: { distId: dist.id },
        include: {
          order: {
            include: {
              product: { select: { name: true, skuCode: true } },
              user: { select: { phone: true, nickname: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.commission.count({ where: { distId: dist.id } }),
    ]);

    const list = rows.map((c) => ({
      id: Number(c.id),
      orderNo: c.order.orderNo,
      phoneMasked: maskPhone(c.order.user.phone),
      nickname: c.order.user.nickname ?? null,
      productName: c.order.product.name,
      orderAmount: Number(c.order.amount),
      commissionAmount: Number(c.amount),
      rate: Number(c.rate),
      status: c.status,
      statusLabel: c.status === 1 ? '已结算' : '待结算',
      paidAt: c.order.paidAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    }));

    return { list, total, page, pageSize };
  }

  async withdraw(userId: bigint, dto: { amount: number; accountInfo: Record<string, unknown> }) {
    const dist = await this.prisma.distributor.findUnique({ where: { userId } });
    if (!dist || dist.status !== 1) throw new BadRequestException('NOT_DISTRIBUTOR');

    const row = await this.prisma.withdraw.create({
      data: {
        distId: dist.id,
        amount: dto.amount,
        accountInfo: dto.accountInfo as object,
      },
    });
    return { id: Number(row.id), status: row.status };
  }
}
