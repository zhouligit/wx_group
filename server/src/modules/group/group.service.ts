import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EntitlementService {
  constructor(private prisma: PrismaService) {}

  async canViewQrcode(userId: bigint, groupId: bigint): Promise<boolean> {
    const now = new Date();
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        status: 1,
        expireAt: { gt: now },
      },
    });
    if (membership) return true;

    const unlock = await this.prisma.groupUnlock.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    return !!unlock;
  }

  async assertCanViewQrcode(userId: bigint, groupId: bigint) {
    const allowed = await this.canViewQrcode(userId, groupId);
    if (!allowed) {
      throw new ForbiddenException('PAYMENT_REQUIRED');
    }
  }
}

@Injectable()
export class GroupService {
  constructor(
    private prisma: PrismaService,
    private entitlement: EntitlementService,
  ) {}

  async list(params: {
    page: number;
    pageSize: number;
    regionId?: number;
    hot?: boolean;
  }) {
    const where = {
      status: { in: [1, 2] },
      ...(params.hot ? { isHot: 1 } : {}),
      ...(params.regionId ? { regionId: BigInt(params.regionId) } : {}),
    };
    const [list, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        include: { region: true, groupTags: { include: { tag: true } } },
        orderBy: [{ weight: 'desc' }, { updatedAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.group.count({ where }),
    ]);
    return {
      list: list.map((g) => this.toListItem(g)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async detail(id: number, userId?: bigint) {
    const group = await this.prisma.group.findUnique({
      where: { id: BigInt(id) },
      include: { region: true, groupTags: { include: { tag: true } } },
    });
    if (!group || group.status === 0) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }
    let qrcodeLocked = true;
    if (userId) {
      qrcodeLocked = !(await this.entitlement.canViewQrcode(userId, group.id));
    }
    return { ...this.toListItem(group), description: group.description, qrcodeLocked };
  }

  async getQrcodeUrl(userId: bigint, groupId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id: BigInt(groupId) },
    });
    if (!group || group.status === 0) {
      throw new NotFoundException('GROUP_NOT_FOUND');
    }
    await this.entitlement.assertCanViewQrcode(userId, group.id);

    // TODO: 替换为 OSS 私有桶签名 URL
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const url = `/mock-qrcode/${groupId}?token=dev&expires=${expiresAt.getTime()}`;
    return { url, expiresAt: expiresAt.toISOString() };
  }

  private toListItem(group: {
    id: bigint;
    name: string;
    coverUrl: string | null;
    regionId: bigint;
    memberCount: number | null;
    status: number;
    region?: { name: string };
    groupTags?: { tag: { name: string } }[];
  }) {
    return {
      id: Number(group.id),
      name: group.name,
      coverUrl: group.coverUrl,
      regionId: Number(group.regionId),
      regionName: group.region?.name ?? '',
      tags: group.groupTags?.map((gt) => gt.tag.name) ?? [],
      memberCount: group.memberCount,
      status: group.status,
    };
  }
}
