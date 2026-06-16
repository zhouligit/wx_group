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
  console.log(`Groups seeded: total ${groupCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
