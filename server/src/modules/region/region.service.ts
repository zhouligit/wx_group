import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RegionService {
  constructor(private prisma: PrismaService) {}

  async list(level?: number, parentId?: number) {
    return this.prisma.region.findMany({
      where: {
        enabled: 1,
        name: { not: '热门群' },
        ...(level ? { level } : {}),
        ...(parentId ? { parentId: BigInt(parentId) } : {}),
      },
      orderBy: { sort: 'asc' },
    });
  }
}
