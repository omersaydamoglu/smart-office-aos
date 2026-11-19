const express = require('express');
const { z } = require('zod');

const {
  authenticateToken,
  authorizeRoles,
} = require('../middleware/authMiddleware');
const departmentService = require('../services/departmentService');

const router = express.Router();

const idSchema = z.string().uuid();
const nameSchema = z.string().trim().min(1).max(100);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

const createSchema = z.object({ name: nameSchema }).strict();

// Yönetici bu uç noktadan değil, PUT /:id/manager ile atanır.
const updateSchema = z
  .object({ name: nameSchema, isActive: z.boolean() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const managerSchema = z.object({ managerId: idSchema.nullable() }).strict();

function parseOr400(schema, value, res) {
  const result = schema.safeParse(value);

  if (!result.success) {
    res.status(400).json({ message: 'Geçersiz istek.' });
    return null;
  }

  return result.data;
}

function parseIdOr404(req, res) {
  if (!idSchema.safeParse(req.params.id).success) {
    res.status(404).json({ message: 'Departman bulunamadı.' });
    return null;
  }

  return req.params.id;
}

function actorOf(req) {
  return { id: req.user.id, ipAddress: req.ip };
}

function viewerOf(req) {
  return {
    id: req.user.id,
    roles: req.user.roles,
    isAdmin: req.user.roles.includes('ADMIN'),
  };
}

const adminOnly = [authenticateToken, authorizeRoles('ADMIN')];

// Tüm giriş yapmış kullanıcılar: ADMIN tam liste, diğerleri aktif departmanların id/ad bilgisi.
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const query = parseOr400(listQuerySchema, req.query, res);
    if (!query) return;

    return res.json(await departmentService.listDepartments(query, viewerOf(req)));
  } catch (error) {
    next(error);
  }
});

router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('ADMIN', 'DEPT_MANAGER'),
  async (req, res, next) => {
    try {
      const id = parseIdOr404(req, res);
      if (!id) return;

      return res.json({ data: await departmentService.getDepartment(id, viewerOf(req)) });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const body = parseOr400(createSchema, req.body, res);
    if (!body) return;

    const department = await departmentService.createDepartment(body, actorOf(req));
    return res.status(201).json({ data: department });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', adminOnly, async (req, res, next) => {
  try {
    const id = parseIdOr404(req, res);
    if (!id) return;
    const body = parseOr400(updateSchema, req.body, res);
    if (!body) return;

    return res.json({ data: await departmentService.updateDepartment(id, body, actorOf(req)) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/manager', adminOnly, async (req, res, next) => {
  try {
    const id = parseIdOr404(req, res);
    if (!id) return;
    const body = parseOr400(managerSchema, req.body, res);
    if (!body) return;

    return res.json({
      data: await departmentService.setDepartmentManager(id, body.managerId, actorOf(req)),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
