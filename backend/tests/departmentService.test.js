jest.mock('../src/config/prisma', () => ({
  $transaction: jest.fn(),
  department: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  auditLog: { create: jest.fn() },
}));

const prisma = require('../src/config/prisma');
const {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  setDepartmentManager,
} = require('../src/services/departmentService');

const DEPT_ID = 'dept-1';
const MANAGER_ID = 'manager-1';
const actor = { id: 'admin-1', ipAddress: '127.0.0.1' };
const admin = { id: 'admin-1', roles: ['ADMIN'], isAdmin: true };

function dbDepartment(overrides = {}) {
  return {
    id: DEPT_ID,
    name: 'Bilgi Teknolojileri',
    isActive: true,
    managerId: MANAGER_ID,
    manager: { id: MANAGER_ID, firstName: 'Y', lastName: 'Ö', email: 'y@smartoffice.test' },
    _count: { members: 4 },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function dbUser({ status = 'ACTIVE', roles = ['DEPT_MANAGER'], departmentId = DEPT_ID } = {}) {
  return {
    id: MANAGER_ID,
    status,
    departmentId,
    roles: roles.map((name) => ({ role: { name } })),
  };
}

function prismaError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

describe('Departman servisi (#39)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((work) =>
      Array.isArray(work) ? Promise.all(work) : work(prisma)
    );
    prisma.department.update.mockImplementation(({ data }) => Promise.resolve(dbDepartment(data)));
    prisma.auditLog.create.mockResolvedValue({});
  });

  describe('listDepartments', () => {
    test('ADMIN üye sayısı ve yöneticiyi görmeli', async () => {
      prisma.department.findMany.mockResolvedValue([dbDepartment()]);
      prisma.department.count.mockResolvedValue(1);

      const result = await listDepartments({ page: 1, limit: 20 }, admin);

      expect(result.data[0]).toMatchObject({ memberCount: 4, manager: { id: MANAGER_ID } });
      expect(prisma.department.findMany.mock.calls[0][0].include._count).toEqual({
        select: { members: { where: { status: 'ACTIVE' } } },
      });
    });

    test('Diğer roller yalnızca aktif departmanların id ve adını görmeli', async () => {
      prisma.department.findMany.mockResolvedValue([{ ...dbDepartment(), _count: undefined }]);
      prisma.department.count.mockResolvedValue(1);

      const result = await listDepartments(
        { page: 1, limit: 20, isActive: false },
        { id: 'u', roles: ['EMPLOYEE'], isAdmin: false }
      );

      expect(prisma.department.findMany.mock.calls[0][0].where.isActive).toBe(true);
      expect(prisma.department.findMany.mock.calls[0][0].include).toBeUndefined();
      expect(result.data).toEqual([{ id: DEPT_ID, name: 'Bilgi Teknolojileri' }]);
    });

    test('ADMIN pasif departmanları filtreleyebilmeli', async () => {
      prisma.department.findMany.mockResolvedValue([]);
      prisma.department.count.mockResolvedValue(0);

      await listDepartments({ page: 2, limit: 10, isActive: false, search: 'bil' }, admin);

      expect(prisma.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: false, name: { contains: 'bil', mode: 'insensitive' } },
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe('getDepartment', () => {
    test('DEPT_MANAGER yönettiği departmanı görebilmeli', async () => {
      prisma.department.findUnique.mockResolvedValue(dbDepartment());

      const result = await getDepartment(DEPT_ID, { id: MANAGER_ID, roles: ['DEPT_MANAGER'], isAdmin: false });

      expect(result.memberCount).toBe(4);
    });

    test('DEPT_MANAGER başka departmanı görememeli (404)', async () => {
      prisma.department.findUnique.mockResolvedValue(dbDepartment({ managerId: 'baska-yonetici' }));

      await expect(
        getDepartment(DEPT_ID, { id: MANAGER_ID, roles: ['DEPT_MANAGER'], isAdmin: false })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    test('Olmayan departman 404', async () => {
      prisma.department.findUnique.mockResolvedValue(null);
      await expect(getDepartment(DEPT_ID, admin)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('createDepartment / updateDepartment', () => {
    test('Oluşturma audit e yazılmalı', async () => {
      prisma.department.create.mockResolvedValue(dbDepartment({ manager: null, _count: { members: 0 } }));

      const result = await createDepartment({ name: 'Muhasebe' }, actor);

      expect(result.memberCount).toBe(0);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'admin-1',
          action: 'DEPARTMENT_CREATED',
          entityType: 'DEPARTMENT',
        }),
      });
    });

    test('Aynı isim 409', async () => {
      prisma.department.create.mockRejectedValue(prismaError('P2002'));
      await expect(createDepartment({ name: 'Genel' }, actor)).rejects.toMatchObject({ statusCode: 409 });
    });

    test('Güncellemede eski ve yeni değer audit e yazılmalı', async () => {
      prisma.department.findUnique.mockResolvedValue(dbDepartment());

      await updateDepartment(DEPT_ID, { isActive: false }, actor);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DEPARTMENT_UPDATED',
          metadata: { from: { isActive: true }, to: { isActive: false } },
        }),
      });
    });

    test('Olmayan departman güncellenememeli (404)', async () => {
      prisma.department.findUnique.mockResolvedValue(null);
      await expect(updateDepartment(DEPT_ID, { name: 'X' }, actor)).rejects.toMatchObject({ statusCode: 404 });
      expect(prisma.department.update).not.toHaveBeenCalled();
    });

    test('Güncellemede aynı isim 409', async () => {
      prisma.department.findUnique.mockResolvedValue(dbDepartment());
      prisma.department.update.mockRejectedValue(prismaError('P2002'));
      await expect(updateDepartment(DEPT_ID, { name: 'Genel' }, actor)).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('setDepartmentManager', () => {
    beforeEach(() => {
      prisma.department.findUnique.mockResolvedValue(dbDepartment({ managerId: null }));
    });

    test('Uygun kullanıcı yönetici atanabilmeli ve audit e yazılmalı', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());

      const result = await setDepartmentManager(DEPT_ID, MANAGER_ID, actor);

      expect(prisma.department.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: DEPT_ID }, data: { managerId: MANAGER_ID } })
      );
      expect(result.manager.id).toBe(MANAGER_ID);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DEPARTMENT_MANAGER_CHANGED',
          metadata: { from: null, to: MANAGER_ID },
        }),
      });
    });

    test.each([
      ['olmayan kullanıcı', null, 'Yönetici olarak atanacak aktif kullanıcı bulunamadı.'],
      ['pasif kullanıcı', dbUser({ status: 'INACTIVE' }), 'Yönetici olarak atanacak aktif kullanıcı bulunamadı.'],
      ['DEPT_MANAGER rolü yok', dbUser({ roles: ['EMPLOYEE'] }), 'Kullanıcının DEPT_MANAGER rolü yok.'],
      ['başka departmanın üyesi', dbUser({ departmentId: 'dept-2' }), 'Yönetici bu departmanın üyesi olmalıdır.'],
    ])('%s yönetici atanamamalı (400)', async (_, user, message) => {
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(setDepartmentManager(DEPT_ID, MANAGER_ID, actor)).rejects.toMatchObject({
        statusCode: 400,
        message,
      });
      expect(prisma.department.update).not.toHaveBeenCalled();
    });

    test('Yönetici kaldırılabilmeli (null)', async () => {
      prisma.department.findUnique.mockResolvedValue(dbDepartment());

      await setDepartmentManager(DEPT_ID, null, actor);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.department.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { managerId: null } })
      );
    });

    test('Olmayan departman 404', async () => {
      prisma.department.findUnique.mockResolvedValue(null);
      await expect(setDepartmentManager(DEPT_ID, MANAGER_ID, actor)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
