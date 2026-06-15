import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type CommissionRow = { amount: unknown; status: number };

@Injectable()
export class DistributorService {
  constructor(private prisma: PrismaService) {}

  private genCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
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
    const dist = await this.prisma.distributor.findUnique({ where: { userId } });
    if (!dist) throw new BadRequestException('NOT_DISTRIBUTOR');

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

    return {
      todayVisits: 0,
      totalVisits: await this.prisma.distRelation.count({ where: { distId: dist.id } }),
      todayOrders: 0,
      totalCommission,
      pendingCommission,
    };
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
