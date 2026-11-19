const prisma = require('../config/prisma');

const MANAGER_ROLE = 'DEPT_MANAGER';

const adminInclude = {
  manager: { select: { id: true, firstName: true, lastName: true, email: true } },
  _count: { select: { members: { where: { status: 'ACTIVE' } } } },
};

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toAdminDepartment(department) {
  return {
    id: department.id,
    name: department.name,
    isActive: department.isActive,
    manager: department.manager || null,
    memberCount: department._count.members,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
  };
}

// ADMIN dışındaki roller yalnızca seçim listeleri için gereken alanları görür.
function toLimitedDepartment(department) {
  return { id: department.id, name: department.name };
}

function audit(tx, { actor, action, entityId, metadata }) {
  return tx.auditLog.create({
    data: {
      actorId: actor.id,
      action,
      entityType: 'DEPARTMENT',
      entityId,
      metadata,
      ipAddress: actor.ipAddress,
    },
  });
}

function mapUniqueNameError(error) {
  if (error.code === 'P2002') {
    return httpError(409, 'Bu isimde bir departman zaten var.');
  }
  return error;
}

async function listDepartments({ page, limit, search, isActive }, { isAdmin }) {
  const where = {};

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  // Pasif departmanları yalnızca ADMIN görebilir.
  if (!isAdmin) {
    where.isActive = true;
  } else if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [departments, total] = await prisma.$transaction([
    prisma.department.findMany({
      where,
      include: isAdmin ? adminInclude : undefined,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.department.count({ where }),
  ]);

  return {
    data: departments.map(isAdmin ? toAdminDepartment : toLimitedDepartment),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ADMIN her departmanı, DEPT_MANAGER yalnızca yönettiği departmanı görür.
// Yetkisiz erişimde de 404 döner; departmanın varlığı sızdırılmaz.
async function getDepartment(id, viewer) {
  const department = await prisma.department.findUnique({ where: { id }, include: adminInclude });

  const canView =
    department &&
    (viewer.isAdmin || (viewer.roles.includes(MANAGER_ROLE) && department.managerId === viewer.id));

  if (!canView) {
    throw httpError(404, 'Departman bulunamadı.');
  }

  return toAdminDepartment(department);
}

async function createDepartment({ name }, actor) {
  try {
    return await prisma.$transaction(async (tx) => {
      const department = await tx.department.create({ data: { name }, include: adminInclude });

      await audit(tx, {
        actor,
        action: 'DEPARTMENT_CREATED',
        entityId: department.id,
        metadata: { name },
      });

      return toAdminDepartment(department);
    });
  } catch (error) {
    throw mapUniqueNameError(error);
  }
}

async function updateDepartment(id, changes, actor) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.department.findUnique({ where: { id } });

      if (!existing) {
        throw httpError(404, 'Departman bulunamadı.');
      }

      const department = await tx.department.update({ where: { id }, data: changes, include: adminInclude });

      await audit(tx, {
        actor,
        action: 'DEPARTMENT_UPDATED',
        entityId: id,
        metadata: {
          from: Object.fromEntries(Object.keys(changes).map((key) => [key, existing[key]])),
          to: changes,
        },
      });

      return toAdminDepartment(department);
    });
  } catch (error) {
    throw mapUniqueNameError(error);
  }
}

// Yönetici; aktif, DEPT_MANAGER rolüne sahip ve bu departmanın üyesi olmalıdır.
// Rol bu uç noktadan otomatik verilmez: rol ataması yalnızca kullanıcı yönetiminden yapılır.
async function setDepartmentManager(id, managerId, actor) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.department.findUnique({ where: { id } });

    if (!existing) {
      throw httpError(404, 'Departman bulunamadı.');
    }

    if (managerId) {
      const user = await tx.user.findUnique({
        where: { id: managerId },
        include: { roles: { include: { role: true } } },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw httpError(400, 'Yönetici olarak atanacak aktif kullanıcı bulunamadı.');
      }

      if (!user.roles.some((item) => item.role.name === MANAGER_ROLE)) {
        throw httpError(400, 'Kullanıcının DEPT_MANAGER rolü yok.');
      }

      if (user.departmentId !== id) {
        throw httpError(400, 'Yönetici bu departmanın üyesi olmalıdır.');
      }
    }

    const department = await tx.department.update({
      where: { id },
      data: { managerId },
      include: adminInclude,
    });

    await audit(tx, {
      actor,
      action: 'DEPARTMENT_MANAGER_CHANGED',
      entityId: id,
      metadata: { from: existing.managerId, to: managerId },
    });

    return toAdminDepartment(department);
  });
}

module.exports = {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  setDepartmentManager,
};
