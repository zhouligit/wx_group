import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type RegionSearchItem = {
  id: number;
  name: string;
  level: number;
  provinceId: number;
  provinceName: string;
  cityKeyword?: string;
  label: string;
};

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

  async search(keyword: string, limit = 20): Promise<RegionSearchItem[]> {
    const q = keyword.trim();
    if (!q) return [];

    const provinces = await this.prisma.region.findMany({
      where: {
        enabled: 1,
        level: 1,
        AND: [{ name: { not: '热门群' } }, { name: { contains: q } }],
      },
      orderBy: { sort: 'asc' },
      take: limit,
    });

    const cities = await this.prisma.region.findMany({
      where: {
        enabled: 1,
        level: 2,
        name: { contains: q },
      },
      orderBy: { sort: 'asc' },
      take: limit,
    });

    const parentIds = [
      ...new Set(
        cities.map((c) => c.parentId).filter((id): id is bigint => id != null),
      ),
    ];
    const parents =
      parentIds.length > 0
        ? await this.prisma.region.findMany({ where: { id: { in: parentIds } } })
        : [];
    const parentMap = new Map(parents.map((p) => [p.id.toString(), p]));

    const results: RegionSearchItem[] = [];

    for (const p of provinces) {
      results.push({
        id: Number(p.id),
        name: p.name,
        level: p.level,
        provinceId: Number(p.id),
        provinceName: p.name,
        label: p.name,
      });
    }

    for (const c of cities) {
      const parent = c.parentId ? parentMap.get(c.parentId.toString()) : null;
      if (!parent) continue;
      const cityKeyword = c.name.replace(/市$|地区$|盟$|自治州$/, '');
      results.push({
        id: Number(c.id),
        name: c.name,
        level: c.level,
        provinceId: Number(parent.id),
        provinceName: parent.name,
        cityKeyword,
        label: `${c.name} · ${parent.name}`,
      });
    }

    return results.slice(0, limit);
  }
}
