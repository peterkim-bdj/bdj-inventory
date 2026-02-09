import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const locations = [
    { name: '1st Floor', code: 'F1', level: 1, description: '1층 매장/창고' },
    { name: 'Basement', code: 'B1', level: 1, description: '지하 창고' },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { code: loc.code },
      update: {},
      create: loc,
    });
  }

  // Seed admin user
  await prisma.user.upsert({
    where: { email: 'peter.kim@sokimnewyork.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'peter.kim@sokimnewyork.com',
      name: 'Peter Kim',
      role: 'ADMIN',
    },
  });

  console.log('Seed completed: 2 locations, 1 admin user');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
