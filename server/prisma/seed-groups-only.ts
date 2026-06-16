import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
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
  await seedCityGroups(prisma);
  const groupCount = await prisma.group.count();
  const byProvince = await prisma.$queryRaw<
    { province: string; cnt: bigint }[]
  >`
    SELECT r.name AS province, COUNT(g.id) AS cnt
    FROM groups g
    JOIN regions r ON g.region_id = r.id AND r.level = 1
    GROUP BY r.name
    ORDER BY cnt DESC
  `;
  console.log(`Groups seeded: total ${groupCount}`);
  console.log('By province (top 10):');
  for (const row of byProvince.slice(0, 10)) {
    console.log(`  ${row.province}: ${row.cnt}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
