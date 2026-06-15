import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

  const regions = [
    '热门群', '北京市', '上海市', '广东省', '浙江省', '江苏省', '山东省', '四川省',
  ];
  for (let i = 0; i < regions.length; i++) {
    const name = regions[i];
    const existing = await prisma.region.findFirst({ where: { name, level: 1 } });
    if (!existing) {
      await prisma.region.create({ data: { name, level: 1, sort: i } });
    }
  }

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

  const beijing = await prisma.region.findFirst({ where: { name: '北京市' } });
  if (beijing) {
    const count = await prisma.group.count();
    if (count === 0) {
      await prisma.group.createMany({
        data: [
          {
            name: '北京饭搭子交流群',
            regionId: beijing.id,
            description: '一起发现京城美食搭子',
            memberCount: 200,
            qrcodePath: 'private/qrcode/demo-beijing-food.jpg',
            isHot: 1,
            weight: 100,
          },
          {
            name: '北京徒步搭子群',
            regionId: beijing.id,
            description: '周末徒步、露营、Citywalk',
            memberCount: 120,
            qrcodePath: 'private/qrcode/demo-beijing-hike.jpg',
            isHot: 1,
            weight: 90,
          },
        ],
      });
    }
  }

  console.log('Seed completed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
