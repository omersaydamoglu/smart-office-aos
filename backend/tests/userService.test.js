jest.mock('../src/config/prisma', () => ({
  $transaction: jest.fn(),
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  role: { findMany: jest.fn() },
  department: { findUnique: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
  userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
  session: { updateMany: jest.fn() },
  auditLog: { create: jest.fn() },
}));

const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');
const {
  listUsers,
  getUser,
  createUser,
  updateUser,
  setUserStatus,
  setUserRoles,
} = require('../src/services/userService');

const ADMIN_ID = 'admin-1';
const TARGET_ID = 'user-2';
const actor = { id: ADMIN_ID, ipAddress: '127.0.0.1' };

function dbUser({ id = TARGET_ID, status = 'ACTIVE', roles = ['EMPLOYEE'] } = {}) {
  return {
    id,
    email: `${id}@smartoffice.test`,
    passwordHash: 'gizli-hash',
    firstName: 'Ad',
    lastName: 'Soyad',
    phone: null,
    status,
    roles: roles.map((name) => ({ role: { name } })),
    department: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function prismaError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

describe('Kullanıcı servisi (#38)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((work) =>
      Array.isArray(work) ? Promise.all(work) : work(prisma)
    );
    prisma.role.findMany.mockImplementation(({ where }) =>
      Promise.resolve(where.name.in.map((name) => ({ id: `role-${name}`, name })))
    );
    prisma.user.update.mockImplementation(({ data }) => Promise.resolve({ ...dbUser(), ...data }));
    prisma.auditLog.create.mockResolvedValue({});
    prisma.department.findMany.mockResolvedValue([]);
    prisma.department.updateMany.mockResolvedValue({ count: 0 });
  });

  describe('listUsers / getUser', () => {
    test('Sayfalama ve arama uygulanmalı, parola hash dönmemeli', async () => {
      prisma.user.findMany.mockResolvedValue([dbUser()]);
      prisma.user.count.mockResolvedValue(45);

      const result = await listUsers({ page: 3, limit: 20, search: 'ali' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 })
      );
      expect(prisma.user.findMany.mock.calls[0][0].where.OR).toHaveLength(3);
      expect(result.pagination).toEqual({ page: 3, limit: 20, total: 45, totalPages: 3 });
      expect(result.data[0]).not.toHaveProperty('passwordHash');
      expect(result.data[0].roles).toEqual(['EMPLOYEE']);
    });

    test('Olmayan kullanıcı 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(getUser('yok')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('createUser', () => {
    const input = {
      email: '  Yeni@SmartOffice.test ',
      password: 'Gecici123!',
      firstName: 'Yeni',
      lastName: 'Kullanici',
      roles: ['EMPLOYEE'],
    };

    test('Parola hash lenmeli, e-posta normalize edilmeli, audit yazılmalı', async () => {
      prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ ...dbUser(), ...data, roles: [] }));

      const result = await createUser(input, actor);
      const { data } = prisma.user.create.mock.calls[0][0];

      expect(data.email).toBe('yeni@smartoffice.test');
      expect(data).not.toHaveProperty('password');
      expect(await bcrypt.compare('Gecici123!', data.passwordHash)).toBe(true);
      expect(data.roles.create).toEqual([{ roleId: 'role-EMPLOYEE' }]);
      expect(result).not.toHaveProperty('passwordHash');
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorId: ADMIN_ID, action: 'USER_CREATED' }),
      });
      expect(JSON.stringify(prisma.auditLog.create.mock.calls)).not.toContain('Gecici123!');
    });

    test('Kayıtlı e-posta 409', async () => {
      prisma.user.create.mockRejectedValue(prismaError('P2002'));
      await expect(createUser(input, actor)).rejects.toMatchObject({ statusCode: 409 });
    });

    test('Olmayan departman 400', async () => {
      prisma.department.findUnique.mockResolvedValue(null);
      await expect(createUser({ ...input, departmentId: 'dep-yok' }, actor)).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    test('Olmayan kullanıcı 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(updateUser(TARGET_ID, { firstName: 'X' }, actor)).rejects.toMatchObject({ statusCode: 404 });
    });

    test('Güncellenen alanlar audit e yazılmalı', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());

      await updateUser(TARGET_ID, { firstName: 'Yeni' }, actor);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'USER_UPDATED', metadata: { fields: ['firstName'] } }),
      });
    });
  });

  describe('setUserStatus', () => {
    test('Kullanıcı pasife alınabilmeli ve açık oturumları kapatılmalı', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());

      const result = await setUserStatus(TARGET_ID, 'INACTIVE', actor);

      expect(result.status).toBe('INACTIVE');
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: TARGET_ID, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_STATUS_CHANGED',
          metadata: { from: 'ACTIVE', to: 'INACTIVE' },
        }),
      });
    });

    test('Admin kendi hesabını pasife alamamalı', async () => {
      await expect(setUserStatus(ADMIN_ID, 'INACTIVE', actor)).rejects.toMatchObject({ statusCode: 409 });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    test('Son aktif ADMIN pasife alınamamalı', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ roles: ['ADMIN'] }));
      prisma.user.count.mockResolvedValue(0);

      await expect(setUserStatus(TARGET_ID, 'INACTIVE', actor)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Son aktif ADMIN pasife alınamaz.',
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    test('Başka aktif ADMIN varsa ADMIN pasife alınabilmeli', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ roles: ['ADMIN'] }));
      prisma.user.count.mockResolvedValue(1);

      await setUserStatus(TARGET_ID, 'INACTIVE', actor);

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          id: { not: TARGET_ID },
          status: 'ACTIVE',
          roles: { some: { role: { name: 'ADMIN' } } },
        },
      });
      expect(prisma.user.update).toHaveBeenCalled();
    });

    test('Kontrol Serializable işlemde yapılmalı', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());

      await setUserStatus(TARGET_ID, 'INACTIVE', actor);

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });

    test('Serileştirme çakışmasında yeniden denenmeli, sürerse 409', async () => {
      prisma.$transaction.mockRejectedValue(prismaError('P2034'));

      await expect(setUserStatus(TARGET_ID, 'INACTIVE', actor)).rejects.toMatchObject({ statusCode: 409 });
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });

    test('Durum zaten aynıysa hiçbir şey yazılmamalı', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ status: 'INACTIVE' }));

      await setUserStatus(TARGET_ID, 'INACTIVE', actor);

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('setUserRoles', () => {
    test('Roller değiştirilmeli ve audit e eski/yeni roller yazılmalı', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(dbUser())
        .mockResolvedValueOnce(dbUser({ roles: ['EMPLOYEE', 'RECEPTION'] }));

      const result = await setUserRoles(TARGET_ID, ['EMPLOYEE', 'RECEPTION'], actor);

      expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: TARGET_ID } });
      expect(prisma.userRole.createMany).toHaveBeenCalledWith({
        data: [
          { userId: TARGET_ID, roleId: 'role-EMPLOYEE' },
          { userId: TARGET_ID, roleId: 'role-RECEPTION' },
        ],
      });
      expect(result.roles).toEqual(['EMPLOYEE', 'RECEPTION']);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_ROLES_CHANGED',
          metadata: { from: ['EMPLOYEE'], to: ['EMPLOYEE', 'RECEPTION'] },
        }),
      });
    });

    test('Admin kendi ADMIN rolünü kaldıramamalı', async () => {
      await expect(setUserRoles(ADMIN_ID, ['EMPLOYEE'], actor)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Kendi ADMIN rolünüzü kaldıramazsınız.',
      });
      expect(prisma.userRole.deleteMany).not.toHaveBeenCalled();
    });

    test('Admin kendi rollerine yenisini ekleyebilmeli', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: ADMIN_ID, roles: ['ADMIN'] }));

      await setUserRoles(ADMIN_ID, ['ADMIN', 'EMPLOYEE'], actor);

      expect(prisma.userRole.createMany).toHaveBeenCalled();
    });

    test('Son aktif ADMIN rolü kaldırılamamalı', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ roles: ['ADMIN'] }));
      prisma.user.count.mockResolvedValue(0);

      await expect(setUserRoles(TARGET_ID, ['EMPLOYEE'], actor)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Son aktif ADMIN rolü kaldırılamaz.',
      });
      expect(prisma.userRole.deleteMany).not.toHaveBeenCalled();
    });

    test('Pasif bir ADMIN in rolü kaldırılabilmeli', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ status: 'INACTIVE', roles: ['ADMIN'] }));
      prisma.user.count.mockResolvedValue(0);

      await setUserRoles(TARGET_ID, ['EMPLOYEE'], actor);

      expect(prisma.userRole.deleteMany).toHaveBeenCalled();
    });

    test('Olmayan kullanıcı 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(setUserRoles(TARGET_ID, ['EMPLOYEE'], actor)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('Departman yöneticiliğinin tutarlılığı', () => {
    beforeEach(() => {
      prisma.department.findMany.mockResolvedValue([{ id: 'dept-1' }]);
    });

    function expectManagershipReleased(reason, where = { managerId: TARGET_ID }) {
      expect(prisma.department.findMany).toHaveBeenCalledWith({ where, select: { id: true } });
      expect(prisma.department.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['dept-1'] } },
        data: { managerId: null },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DEPARTMENT_MANAGER_CHANGED',
          entityType: 'DEPARTMENT',
          entityId: 'dept-1',
          metadata: { from: TARGET_ID, to: null, reason },
        }),
      });
    }

    test('Pasife alınan yöneticinin yöneticiliği düşmeli', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ roles: ['DEPT_MANAGER'] }));

      await setUserStatus(TARGET_ID, 'INACTIVE', actor);

      expectManagershipReleased('USER_DEACTIVATED');
    });

    test('Yeniden aktif yapılan kullanıcıda departmanlara dokunulmamalı', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ status: 'INACTIVE', roles: ['DEPT_MANAGER'] }));

      await setUserStatus(TARGET_ID, 'ACTIVE', actor);

      expect(prisma.department.updateMany).not.toHaveBeenCalled();
    });

    test('DEPT_MANAGER rolü kaldırılınca yöneticilik düşmeli', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ roles: ['DEPT_MANAGER', 'EMPLOYEE'] }));

      await setUserRoles(TARGET_ID, ['EMPLOYEE'], actor);

      expectManagershipReleased('ROLE_REMOVED');
    });

    test('DEPT_MANAGER rolü korunursa yöneticilik düşmemeli', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ roles: ['DEPT_MANAGER'] }));

      await setUserRoles(TARGET_ID, ['DEPT_MANAGER', 'EMPLOYEE'], actor);

      expect(prisma.department.findMany).not.toHaveBeenCalled();
      expect(prisma.department.updateMany).not.toHaveBeenCalled();
    });

    test('Başka departmana taşınan yöneticinin eski departmandaki yöneticiliği düşmeli', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...dbUser(), departmentId: 'dept-1' });
      prisma.department.findUnique.mockResolvedValue({ id: 'dept-2' });

      await updateUser(TARGET_ID, { departmentId: 'dept-2' }, actor);

      expectManagershipReleased('DEPARTMENT_CHANGED', { managerId: TARGET_ID, id: { not: 'dept-2' } });
    });

    test('Departmandan çıkarılan (null) yöneticinin yöneticiliği düşmeli', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...dbUser(), departmentId: 'dept-1' });

      await updateUser(TARGET_ID, { departmentId: null }, actor);

      expectManagershipReleased('DEPARTMENT_CHANGED');
    });

    test('Departmanı değişmeyen güncellemede departmanlara dokunulmamalı', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...dbUser(), departmentId: 'dept-1' });
      prisma.department.findUnique.mockResolvedValue({ id: 'dept-1' });

      await updateUser(TARGET_ID, { firstName: 'Yeni', departmentId: 'dept-1' }, actor);

      expect(prisma.department.findMany).not.toHaveBeenCalled();
    });

    test('Yönettiği departman yoksa güncelleme ve ek kayıt yapılmamalı', async () => {
      prisma.department.findMany.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue(dbUser({ roles: ['DEPT_MANAGER'] }));

      await setUserStatus(TARGET_ID, 'INACTIVE', actor);

      expect(prisma.department.updateMany).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });
  });
});
