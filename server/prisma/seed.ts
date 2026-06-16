import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PROVINCES_LEVEL1 } from './data/provinces';
import { seedCityGroups } from './data/seed-groups';

for (const p of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../.env'),
  resolve(__dirname, '../.env'),
  resolve(__dirname, '../../.env'),
]) {
  if (existsSync(p)) config({ path: p });
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  await prisma.adminUser.upsert({
    where: { username: process.env.ADMIN_USERNAME || 'admin' },
    create: {
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash,
      role: 'super',
    },
    update: { passwordHash },
  });

  // 全国省级行政区（「热门群」为首页 Tab，不入库）
  for (let i = 0; i < PROVINCES_LEVEL1.length; i++) {
    const name = PROVINCES_LEVEL1[i];
    const existing = await prisma.region.findFirst({ where: { name, level: 1 } });
    if (existing) {
      await prisma.region.update({
        where: { id: existing.id },
        data: { sort: i + 1, enabled: 1 },
      });
    } else {
      await prisma.region.create({ data: { name, level: 1, sort: i + 1 } });
    }
  }
  await prisma.region.updateMany({
    where: { name: '热门群', level: 1 },
    data: { enabled: 0 },
  });

  const products = [
    { skuCode: 'MONTH', name: '月会员', price: 19.9, durationDays: 30, sort: 1 },
    { skuCode: 'QUARTER', name: '季会员', price: 49.9, durationDays: 90, sort: 2 },
    { skuCode: 'YEAR', name: '年会员', price: 99, durationDays: 365, sort: 3 },
    { skuCode: 'UNLOCK', name: '单群解锁', price: 9.9, durationDays: null, sort: 4 },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { skuCode: p.skuCode },
      create: p,
      update: { price: p.price, name: p.name, durationDays: p.durationDays },
    });
  }

  await seedCityGroups(prisma);

  const groupCount = await prisma.group.count();
  const cityCount = await prisma.region.count({ where: { level: 2 } });
  console.log(`Seed completed: ${groupCount} groups, ${cityCount} cities`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
