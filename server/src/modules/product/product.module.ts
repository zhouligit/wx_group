import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ok } from '../../common/response';
import { Module } from '@nestjs/common';

@Controller('products')
export class ProductController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const rows = await this.prisma.product.findMany({
      where: { enabled: 1, skuCode: 'UNLOCK' },
      orderBy: { sort: 'asc' },
    });
    return ok(
      rows.map((p: { id: bigint; skuCode: string; name: string; price: unknown; durationDays: number | null }) => ({
        id: Number(p.id),
        skuCode: p.skuCode,
        name: p.name,
        price: Number(p.price),
        durationDays: p.durationDays,
      })),
    );
  }
}

@Module({ controllers: [ProductController] })
export class ProductModule {}
