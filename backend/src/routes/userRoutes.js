const express = require('express');
const { z } = require('zod');

const {
  authenticateToken,
  authorizeRoles,
} = require('../middleware/authMiddleware');
const userService = require('../services/userService');

const router = express.Router();

const ROLE_NAMES = ['ADMIN', 'RECEPTION', 'DEPT_MANAGER', 'EMPLOYEE'];
const STATUSES = ['ACTIVE', 'INACTIVE'];

const idSchema = z.string().uuid();
const nameSchema = z.string().trim().min(1).max(100);
const phoneSchema = z.string().trim().max(30).nullable();
const departmentIdSchema = z.string().uuid().nullable();
const rolesSchema = z
  .array(z.enum(ROLE_NAMES))
  .min(1)
  .transform((roles) => [...new Set(roles)]);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  status: z.enum(STATUSES).optional(),
});

const createSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema.optional(),
    departmentId: departmentIdSchema.optional(),
    roles: rolesSchema,
  })
  .strict();

// Rol, durum ve parola bu uç noktadan değiştirilemez (strict: bilinmeyen alan 400).
const updateSchema = z
  .object({
    email: z.string().trim().email(),
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema,
    departmentId: departmentIdSchema,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const statusSchema = z.object({ status: z.enum(STATUSES) }).strict();
const rolesBodySchema = z.object({ roles: rolesSchema }).strict();

function parseOr400(schema, value, res) {
  const result = schema.safeParse(value);

  if (!result.success) {
    res.status(400).json({ message: 'Geçersiz istek.' });
    return null;
  }

  return result.data;
}

// Geçersiz biçimli id için de 404 döner; kaynak varlığı hakkında bilgi verilmez.
function parseIdOr404(req, res) {
  if (!idSchema.safeParse(req.params.id).success) {
    res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    return null;
  }

  return req.params.id;
}

function actorOf(req) {
  return { id: req.user.id, ipAddress: req.ip };
}

// Giriş yapmış kullanıcının kendi bilgileri
router.get('/me', authenticateToken, (req, res) => {
  return res.status(200).json({
    message: 'Kullanıcı bilgileri başarıyla getirildi.',
    data: {
      id: req.user.id,
      email: req.user.email,
      roles: req.user.roles,
    },
  });
});

// Sadece ADMIN rolüne sahip kullanıcılar erişebilir
router.get(
  '/admin',
  authenticateToken,
  authorizeRoles('ADMIN'),
  (req, res) => {
    return res.status(200).json({
      message: 'Admin erişimi başarılı.',
      data: {
        userId: req.user.id,
        roles: req.user.roles,
      },
    });
  }
);

// Kullanıcı yönetimi (#38): ilk sürümde yalnızca ADMIN erişebilir.
const adminOnly = [authenticateToken, authorizeRoles('ADMIN')];

router.get('/', adminOnly, async (req, res, next) => {
  try {
    const query = parseOr400(listQuerySchema, req.query, res);
    if (!query) return;

    return res.json(await userService.listUsers(query));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', adminOnly, async (req, res, next) => {
  try {
    const id = parseIdOr404(req, res);
    if (!id) return;

    return res.json({ data: await userService.getUser(id) });
  } catch (error) {
    next(error);
  }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const body = parseOr400(createSchema, req.body, res);
    if (!body) return;

    const user = await userService.createUser(body, actorOf(req));
    return res.status(201).json({ data: user });
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

    return res.json({ data: await userService.updateUser(id, body, actorOf(req)) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', adminOnly, async (req, res, next) => {
  try {
    const id = parseIdOr404(req, res);
    if (!id) return;
    const body = parseOr400(statusSchema, req.body, res);
    if (!body) return;

    return res.json({
      data: await userService.setUserStatus(id, body.status, actorOf(req)),
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/roles', adminOnly, async (req, res, next) => {
  try {
    const id = parseIdOr404(req, res);
    if (!id) return;
    const body = parseOr400(rolesBodySchema, req.body, res);
    if (!body) return;

    return res.json({
      data: await userService.setUserRoles(id, body.roles, actorOf(req)),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
