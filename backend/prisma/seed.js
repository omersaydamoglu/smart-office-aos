// Smart Office (AOS) - gelistirme seed'i
// Rolleri, demo departmanlari ve her rol icin bir test kullanicisi olusturur.
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

const DEPARTMENTS = ['Genel', 'Bilgi Teknolojileri', 'Muhasebe'];

const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD || 'Test123!dev';

const TEST_USERS = [
  {
    email: process.env.SEED_ADMIN_EMAIL || 'admin@smartoffice.test',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin123!dev',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'ADMIN',
    department: 'Genel',
  },
  {
    email: 'resepsiyon@smartoffice.test',
    password: TEST_PASSWORD,
    firstName: 'Test',
    lastName: 'Resepsiyon',
    role: 'RECEPTION',
    department: 'Genel',
  },
  {
    email: 'yonetici@smartoffice.test',
    password: TEST_PASSWORD,
    firstName: 'Test',
    lastName: 'Yonetici',
    role: 'DEPT_MANAGER',
    department: 'Bilgi Teknolojileri',
  },
  {
    email: 'calisan@smartoffice.test',
    password: TEST_PASSWORD,
    firstName: 'Test',
    lastName: 'Calisan',
    role: 'EMPLOYEE',
    department: 'Bilgi Teknolojileri',
  },
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

  // 2. Demo departmanlar
  for (const name of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Departmanlar hazir: ${DEPARTMENTS.join(', ')}`);

  // 3. Test kullanicilari
  for (const testUser of TEST_USERS) {
    const department = await prisma.department.findUniqueOrThrow({
      where: { name: testUser.department },
    });
    const passwordHash = await bcrypt.hash(testUser.password, 12);

    const user = await prisma.user.upsert({
      where: { email: testUser.email },
      update: {},
      create: {
        email: testUser.email,
        passwordHash,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        emailVerifiedAt: new Date(),
        departmentId: department.id,
      },
    });

    const role = await prisma.role.findUniqueOrThrow({ where: { name: testUser.role } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    // Departman yoneticisini departmanina bagla
    if (testUser.role === 'DEPT_MANAGER') {
      await prisma.department.update({
        where: { id: department.id },
        data: { managerId: user.id },
      });
    }
  }

  console.log(`Test kullanicilari hazir: ${TEST_USERS.map((u) => u.email).join(', ')}`);
}

main()
  .catch((err) => {
    console.error('Seed hatasi:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
