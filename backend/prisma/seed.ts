import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CATEGORIES = ['Bebidas', 'Comida', 'Limpieza', 'Snacks'] as const;

type CategoryName = (typeof CATEGORIES)[number];

const PRODUCTS: Array<{
  name: string;
  sku: string;
  cost: string;
  price: string;
  stock: number;
  description?: string;
  isActive?: boolean;
  category: CategoryName;
}> = [
  { name: 'Coca-Cola 1.5L', sku: 'BEB-COC-100', cost: '9.50', price: '15.00', stock: 48, category: 'Bebidas' },
  { name: 'Aceite 1L', sku: 'BEB-ACE-200', cost: '22.00', price: '35.00', stock: 12, description: 'Vegetal 1L', category: 'Bebidas' },
  { name: 'Arroz 1kg', sku: 'COM-ARR-300', cost: '8.00', price: '14.00', stock: 60, category: 'Comida' },
  { name: 'Atún pack x4', sku: 'COM-ATU-400', cost: '18.50', price: '32.00', stock: 0, category: 'Comida' },
  { name: 'Detergente 3kg', sku: 'LIM-DET-500', cost: '28.00', price: '45.00', stock: 25, category: 'Limpieza' },
  { name: 'Jabón líquido', sku: 'LIM-JAB-600', cost: '11.00', price: '20.00', stock: 18, isActive: false, category: 'Limpieza' },
  { name: 'Galletas 400g', sku: 'SNA-GAL-700', cost: '12.00', price: '22.00', stock: 80, category: 'Snacks' },
  { name: 'Papas fritas', sku: 'SNA-PAP-800', cost: '14.00', price: '26.00', stock: 33, category: 'Snacks' },
];

const PASSWORD_SALT_ROUNDS = 10;

async function seedAdmin() {
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
      passwordHash: await hash(password, PASSWORD_SALT_ROUNDS),
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`Seeded admin user: ${email}`);
}

async function seedDemoData() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping demo data in production.');
    return;
  }

  // Demo staff login.
  const empEmail = 'emp@store.local';
  const empExisting = await prisma.user.findUnique({ where: { email: empEmail } });
  if (empExisting) {
    console.log(`Demo employee already exists: ${empEmail}`);
  } else {
    await prisma.user.create({
      data: {
        name: 'Employee',
        email: empEmail,
        passwordHash: await hash('emp123', PASSWORD_SALT_ROUNDS),
        role: 'EMPLOYEE',
        isActive: true,
      },
    });
    console.log(`Seeded demo employee: ${empEmail} / emp123`);
  }

  // Categories (upsert by unique name — re-running is a no-op).
  const categoryByName = new Map<CategoryName, string>();
  for (const name of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    categoryByName.set(name, category.id);
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`);

  // Products (upsert by unique sku). Money stays Decimal — never floats.
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        name: p.name,
        sku: p.sku,
        cost: new Prisma.Decimal(p.cost),
        price: new Prisma.Decimal(p.price),
        description: p.description ?? null,
        stock: p.stock,
        isActive: p.isActive ?? true,
        categoryId: categoryByName.get(p.category)!,
      },
      update: {},
    });
  }
  console.log(`Seeded ${PRODUCTS.length} products.`);
}

async function main() {
  await seedAdmin();
  await seedDemoData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
