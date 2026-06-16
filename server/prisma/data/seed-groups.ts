import { PrismaClient } from '@prisma/client';
import { PROVINCES_LEVEL1 } from './provinces';
import {
  GROUP_TEMPLATES,
  PROVINCE_CITIES,
  regionShortName,
} from './cities';

const HOT_CITY_LABELS = new Set([
  '北京',
  '上海',
  '广州',
  '深圳',
  '杭州',
  '成都',
  '武汉',
  '西安',
  '南京',
  '重庆',
]);

function qrcodePath(cityLabel: string, kind: string) {
  const slug = `${cityLabel}-${kind}`.replace(/[^\w\u4e00-\u9fa5-]/g, '');
  return `private/qrcode/demo-${slug}.jpg`;
}

export async function seedTags(prisma: PrismaClient) {
  const tagNames = ['饭搭子', '徒步', '交友', '运动', '旅行'];
  for (let i = 0; i < tagNames.length; i++) {
    await prisma.tag.upsert({
      where: { name: tagNames[i] },
      create: { name: tagNames[i], sort: i + 1 },
      update: { sort: i + 1 },
    });
  }
}

export async function seedCityRegions(prisma: PrismaClient) {
  for (const provinceName of PROVINCES_LEVEL1) {
    const province = await prisma.region.findFirst({
      where: { name: provinceName, level: 1 },
    });
    if (!province) continue;

    const cities = PROVINCE_CITIES[provinceName] ?? [];
    for (let i = 0; i < cities.length; i++) {
      const cityName = cities[i];
      const existing = await prisma.region.findFirst({
        where: { name: cityName, level: 2, parentId: province.id },
      });
      if (existing) {
        await prisma.region.update({
          where: { id: existing.id },
          data: { sort: i + 1, enabled: 1 },
        });
      } else {
        await prisma.region.create({
          data: {
            name: cityName,
            level: 2,
            parentId: province.id,
            sort: i + 1,
          },
        });
      }
    }
  }
}

async function ensureGroup(
  prisma: PrismaClient,
  params: {
    regionId: bigint;
    cityLabel: string;
    template: (typeof GROUP_TEMPLATES)[number];
    weight: number;
    isHot: number;
  },
) {
  const name = `${params.cityLabel}${params.template.suffix}`;
  const existing = await prisma.group.findFirst({ where: { name } });
  if (existing) {
    await prisma.group.update({
      where: { id: existing.id },
      data: {
        regionId: params.regionId,
        description: params.template.desc,
        weight: params.weight,
        isHot: params.isHot,
        status: 1,
      },
    });
    return existing.id;
  }

  const group = await prisma.group.create({
    data: {
      name,
      regionId: params.regionId,
      description: params.template.desc,
      memberCount: 80 + Math.floor(Math.random() * 180),
      qrcodePath: qrcodePath(params.cityLabel, params.template.tag),
      isHot: params.isHot,
      weight: params.weight,
    },
  });

  const tag = await prisma.tag.findUnique({ where: { name: params.template.tag } });
  if (tag) {
    await prisma.groupTag.upsert({
      where: { groupId_tagId: { groupId: group.id, tagId: tag.id } },
      create: { groupId: group.id, tagId: tag.id },
      update: {},
    });
  }
  return group.id;
}

export async function seedCityGroups(prisma: PrismaClient) {
  await seedTags(prisma);
  await seedCityRegions(prisma);

  let weight = 1000;
  for (const provinceName of PROVINCES_LEVEL1) {
    const province = await prisma.region.findFirst({
      where: { name: provinceName, level: 1 },
    });
    if (!province) continue;

    const cities = PROVINCE_CITIES[provinceName] ?? [];
    const targets: { regionId: bigint; cityLabel: string }[] = [];

    if (cities.length === 0) {
      targets.push({
        regionId: province.id,
        cityLabel: regionShortName(provinceName),
      });
    } else {
      for (const cityName of cities) {
        const city = await prisma.region.findFirst({
          where: { name: cityName, level: 2, parentId: province.id },
        });
        if (city) {
          targets.push({ regionId: city.id, cityLabel: regionShortName(cityName) });
        }
      }
    }

    for (const target of targets) {
      const isHot = HOT_CITY_LABELS.has(target.cityLabel) ? 1 : 0;
      for (let t = 0; t < GROUP_TEMPLATES.length; t++) {
        await ensureGroup(prisma, {
          regionId: target.regionId,
          cityLabel: target.cityLabel,
          template: GROUP_TEMPLATES[t],
          weight: weight--,
          isHot: t === 0 ? isHot : 0,
        });
      }
    }
  }
}
