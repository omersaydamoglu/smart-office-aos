// Smart Office (AOS) - gelistirme seed'i
// Rolleri, bir demo departmani ve bir test admin kullanicisi olusturur.
// Birden fazla kez calistirilabilir (upsert kullanir).
// YALNIZCA gelistirme/demo icindir; sentetik veri kullanir.

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ROLES = [
  { name: 'ADMIN', description: 'Sistem yoneticisi' },
  { name: 'RECEPTION', description: 'Resepsiyon' },
  { name: 'DEPT_MANAGER', description: 'Departman yoneticisi' },
  { name: 'EMPLOYEE', description: 'Calisan' },
];

async function main() {
  // 1. Roller
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
  console.log(`Roller hazir: ${ROLES.map((r) => r.name).join(', ')}`);

  // 2. Demo departman
  const department = await prisma.department.upsert({
    where: { name: 'Genel' },
    update: {},
    create: { name: 'Genel' },
  });

  // 3. Test admin kullanicisi
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@smartoffice.test';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!dev';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      firstName: 'Test',
      lastName: 'Admin',
      emailVerifiedAt: new Date(),
      departmentId: department.id,
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.log(`Test admin hazir: ${email}`);
}

main()
  .catch((err) => {
    console.error('Seed hatasi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
