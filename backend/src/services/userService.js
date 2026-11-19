const bcrypt = require('bcryptjs');
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');

const PASSWORD_HASH_ROUNDS = 12;
const ADMIN_ROLE = 'ADMIN';
const MAX_TX_RETRIES = 3;

const userInclude = {
  roles: { include: { role: true } },
  department: { select: { id: true, name: true } },
};

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Parola hash'i ve iç ilişki yapısı dışarı verilmez.
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    status: user.status,
    roles: user.roles.map((item) => item.role.name),
    department: user.department || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Son aktif ADMIN kontrolü eşzamanlı isteklerde aşılamasın diye
// Serializable işlem içinde yapılır; çakışmada işlem yeniden denenir.
async function runSerializable(work) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (error.code !== 'P2034') {
        throw error;
      }
      if (attempt >= MAX_TX_RETRIES) {
        throw httpError(409, 'İşlem çakıştı, lütfen tekrar deneyin.');
      }
    }
  }
}

function countOtherActiveAdmins(tx, userId) {
  return tx.user.count({
    where: {
      id: { not: userId },
      status: 'ACTIVE',
      roles: { some: { role: { name: ADMIN_ROLE } } },
    },
  });
}

async function resolveRoleIds(tx, roleNames) {
  const roles = await tx.role.findMany({ where: { name: { in: roleNames } } });

  if (roles.length !== roleNames.length) {
    throw httpError(400, 'Geçersiz rol.');
  }

  return roles.map((role) => role.id);
}

async function assertDepartmentExists(tx, departmentId) {
  if (!departmentId) return;

  const department = await tx.department.findUnique({ where: { id: departmentId } });

  if (!department) {
    throw httpError(400, 'Departman bulunamadı.');
  }
}

function audit(tx, { actor, action, entityId, metadata }) {
  return tx.auditLog.create({
    data: {
      actorId: actor.id,
      action,
      entityType: 'USER',
      entityId,
      metadata,
      ipAddress: actor.ipAddress,
    },
  });
}

function mapUniqueEmailError(error) {
  if (error.code === 'P2002') {
    return httpError(409, 'Bu e-posta adresi zaten kayıtlı.');
  }
  return error;
}

async function listUsers({ page, limit, search, status }) {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = ['email', 'firstName', 'lastName'].map((field) => ({
      [field]: { contains: search, mode: 'insensitive' },
    }));
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      include: userInclude,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map(toPublicUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getUser(id) {
  const user = await prisma.user.findUnique({ where: { id }, include: userInclude });

  if (!user) {
    throw httpError(404, 'Kullanıcı bulunamadı.');
  }

  return toPublicUser(user);
}

async function createUser(input, actor) {
  const { password, roles, ...profile } = input;
  const email = profile.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

  try {
    return await prisma.$transaction(async (tx) => {
      await assertDepartmentExists(tx, profile.departmentId);
      const roleIds = await resolveRoleIds(tx, roles);

      const user = await tx.user.create({
        data: {
          ...profile,
          email,
          passwordHash,
          roles: { create: roleIds.map((roleId) => ({ roleId })) },
        },
        include: userInclude,
      });

      await audit(tx, {
        actor,
        action: 'USER_CREATED',
        entityId: user.id,
        metadata: { roles },
      });

      return toPublicUser(user);
    });
  } catch (error) {
    throw mapUniqueEmailError(error);
  }
}

async function updateUser(id, changes, actor) {
  const data = { ...changes };

  if (data.email) {
    data.email = data.email.trim().toLowerCase();
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id } });

      if (!existing) {
        throw httpError(404, 'Kullanıcı bulunamadı.');
      }

      await assertDepartmentExists(tx, data.departmentId);

      const user = await tx.user.update({ where: { id }, data, include: userInclude });

      await audit(tx, {
        actor,
        action: 'USER_UPDATED',
        entityId: id,
        metadata: { fields: Object.keys(data) },
      });

      return toPublicUser(user);
    });
  } catch (error) {
    throw mapUniqueEmailError(error);
  }
}

async function setUserStatus(id, status, actor) {
  if (id === actor.id && status === 'INACTIVE') {
    throw httpError(409, 'Kendi hesabınızı pasife alamazsınız.');
  }

  return runSerializable(async (tx) => {
    const existing = await tx.user.findUnique({ where: { id }, include: userInclude });

    if (!existing) {
      throw httpError(404, 'Kullanıcı bulunamadı.');
    }

    if (existing.status === status) {
      return toPublicUser(existing);
    }

    const isAdmin = existing.roles.some((item) => item.role.name === ADMIN_ROLE);

    if (status === 'INACTIVE' && isAdmin && (await countOtherActiveAdmins(tx, id)) === 0) {
      throw httpError(409, 'Son aktif ADMIN pasife alınamaz.');
    }

    const user = await tx.user.update({ where: { id }, data: { status }, include: userInclude });

    // Pasife alınan kullanıcının açık oturumları hemen kapatılır.
    if (status === 'INACTIVE') {
      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await audit(tx, {
      actor,
      action: 'USER_STATUS_CHANGED',
      entityId: id,
      metadata: { from: existing.status, to: status },
    });

    return toPublicUser(user);
  });
}

async function setUserRoles(id, roles, actor) {
  const removesAdmin = !roles.includes(ADMIN_ROLE);

  if (id === actor.id && removesAdmin) {
    throw httpError(409, 'Kendi ADMIN rolünüzü kaldıramazsınız.');
  }

  return runSerializable(async (tx) => {
    const existing = await tx.user.findUnique({ where: { id }, include: userInclude });

    if (!existing) {
      throw httpError(404, 'Kullanıcı bulunamadı.');
    }

    const previousRoles = existing.roles.map((item) => item.role.name);
    const wasActiveAdmin = existing.status === 'ACTIVE' && previousRoles.includes(ADMIN_ROLE);

    if (wasActiveAdmin && removesAdmin && (await countOtherActiveAdmins(tx, id)) === 0) {
      throw httpError(409, 'Son aktif ADMIN rolü kaldırılamaz.');
    }

    const roleIds = await resolveRoleIds(tx, roles);

    await tx.userRole.deleteMany({ where: { userId: id } });
    await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });

    await audit(tx, {
      actor,
      action: 'USER_ROLES_CHANGED',
      entityId: id,
      metadata: { from: previousRoles, to: roles },
    });

    const user = await tx.user.findUnique({ where: { id }, include: userInclude });
    return toPublicUser(user);
  });
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  setUserStatus,
  setUserRoles,
};
