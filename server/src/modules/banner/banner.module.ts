import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ok } from '../../common/response';
import { Controller, Get } from '@nestjs/common';

@Controller('banners')
export class BannerController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const rows = await this.prisma.banner.findMany({
      where: { enabled: 1 },
      orderBy: { sort: 'asc' },
    });
    return ok(
      rows.map((b) => ({
        id: Number(b.id),
        imageUrl: b.imageUrl,
        linkUrl: b.linkUrl,
        sort: b.sort,
      })),
    );
  }
}

@Module({ controllers: [BannerController] })
export class BannerModule {}
