import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@store.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      name: 'Admin',
      email,
      passwordHash: await hash(password, 10),
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`Seeded admin user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
