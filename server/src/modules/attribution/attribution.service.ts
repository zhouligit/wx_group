import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttributionService {
  constructor(private prisma: PrismaService) {}

  async track(inviteCode: string, userId?: bigint) {
    const dist = await this.prisma.distributor.findUnique({ where: { inviteCode } });
    if (!dist) throw new NotFoundException('INVALID_INVITE_CODE');

    if (userId) {
      await this.prisma.distRelation.upsert({
        where: { userId },
        create: { distId: dist.id, userId },
        update: {},
      });
    }

    return { inviteCode, distId: Number(dist.id), bound: !!userId };
  }
}
