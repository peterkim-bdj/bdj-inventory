import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const stuck = await prisma.syncLog.updateMany({
    where: { status: { in: ['FETCHING', 'APPLYING'] } },
    data: { status: 'FAILED', error: 'Manually reset', completedAt: new Date() },
  });
  console.log(`Reset ${stuck.count} stuck sync logs`);

  const shops = await prisma.shopifyStore.updateMany({
    where: { syncStatus: 'IN_PROGRESS' },
    data: { syncStatus: 'SYNCED' },
  });
  console.log(`Reset ${shops.count} shops from IN_PROGRESS`);

  await prisma.$disconnect();
}

main().catch(console.error);
