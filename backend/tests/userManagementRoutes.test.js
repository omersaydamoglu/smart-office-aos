jest.mock('../src/services/userService', () => ({
  listUsers: jest.fn(),
  getUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  setUserStatus: jest.fn(),
  setUserRoles: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const userService = require('../src/services/userService');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';

function tokenFor(roles, sub = ADMIN_ID) {
  return jwt.sign({ sub, email: 'test@smartoffice.test', roles }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
}

const adminAuth = `Bearer ${tokenFor(['ADMIN'])}`;

const validCreate = {
  email: 'yeni@smartoffice.test',
  password: 'Gecici123!',
  firstName: 'Yeni',
  lastName: 'Kullanici',
  roles: ['EMPLOYEE'],
};

const endpoints = [
  ['get', '/api/users', undefined],
  ['get', `/api/users/${USER_ID}`, undefined],
  ['post', '/api/users', validCreate],
  ['patch', `/api/users/${USER_ID}`, { firstName: 'X' }],
  ['patch', `/api/users/${USER_ID}/status`, { status: 'INACTIVE' }],
  ['put', `/api/users/${USER_ID}/roles`, { roles: ['EMPLOYEE'] }],
];

function send(method, path, body, auth) {
  let req = request(app)[method](path);
  if (auth) req = req.set('Authorization', auth);
  return body ? req.send(body) : req;
}

describe('Kullanıcı yönetimi route testleri (#38)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userService.listUsers.mockResolvedValue({ data: [], pagination: {} });
    userService.getUser.mockResolvedValue({ id: USER_ID });
    userService.createUser.mockResolvedValue({ id: USER_ID });
    userService.updateUser.mockResolvedValue({ id: USER_ID });
    userService.setUserStatus.mockResolvedValue({ id: USER_ID });
    userService.setUserRoles.mockResolvedValue({ id: USER_ID });
  });

  describe('Yetki: yalnızca ADMIN', () => {
    test.each(endpoints)('%s %s tokensiz 401', async (method, path, body) => {
      const response = await send(method, path, body);
      expect(response.statusCode).toBe(401);
    });

    test.each(
      ['RECEPTION', 'DEPT_MANAGER', 'EMPLOYEE'].flatMap((role) =>
        endpoints.map(([method, path, body]) => [role, method, path, body])
      )
    )('%s rolü %s %s için 403 almalı', async (role, method, path, body) => {
      const response = await send(method, path, body, `Bearer ${tokenFor([role])}`);
      expect(response.statusCode).toBe(403);
    });

    test.each(endpoints)('ADMIN %s %s erişebilmeli', async (method, path, body) => {
      const response = await send(method, path, body, adminAuth);
      expect([200, 201]).toContain(response.statusCode);
    });

    test('Yetkisiz istekte servis hiç çağrılmamalı', async () => {
      await send('put', `/api/users/${USER_ID}/roles`, { roles: ['ADMIN'] }, `Bearer ${tokenFor(['EMPLOYEE'])}`);
      expect(userService.setUserRoles).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/users', () => {
    test('Varsayılan sayfalama page=1 limit=20', async () => {
      await send('get', '/api/users', undefined, adminAuth);
      expect(userService.listUsers).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    test('Sorgu parametreleri iletilmeli', async () => {
      await send('get', '/api/users?page=2&limit=5&search=ali&status=INACTIVE', undefined, adminAuth);
      expect(userService.listUsers).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'ali',
        status: 'INACTIVE',
      });
    });

    test.each(['limit=1000', 'page=0', 'status=DELETED'])('Geçersiz sorgu (%s) 400', async (query) => {
      const response = await send('get', `/api/users?${query}`, undefined, adminAuth);
      expect(response.statusCode).toBe(400);
      expect(userService.listUsers).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/users', () => {
    test('Geçerli istek 201 ve işlemi yapan admin servise iletilmeli', async () => {
      const response = await send('post', '/api/users', validCreate, adminAuth);

      expect(response.statusCode).toBe(201);
      expect(userService.createUser).toHaveBeenCalledWith(
        validCreate,
        expect.objectContaining({ id: ADMIN_ID })
      );
    });

    test('Tekrarlanan roller tekilleştirilmeli', async () => {
      await send('post', '/api/users', { ...validCreate, roles: ['EMPLOYEE', 'EMPLOYEE'] }, adminAuth);
      expect(userService.createUser.mock.calls[0][0].roles).toEqual(['EMPLOYEE']);
    });

    test.each([
      ['kısa parola', { password: 'kisa' }],
      ['geçersiz e-posta', { email: 'gecersiz' }],
      ['bilinmeyen rol', { roles: ['ROOT'] }],
      ['boş rol listesi', { roles: [] }],
      ['boş ad', { firstName: '  ' }],
      ['bilinmeyen alan', { status: 'ACTIVE' }],
    ])('%s 400 dönmeli', async (_, override) => {
      const response = await send('post', '/api/users', { ...validCreate, ...override }, adminAuth);
      expect(response.statusCode).toBe(400);
      expect(userService.createUser).not.toHaveBeenCalled();
    });

    test('Servisten gelen 409 iletilmeli', async () => {
      const error = new Error('Bu e-posta adresi zaten kayıtlı.');
      error.statusCode = 409;
      userService.createUser.mockRejectedValue(error);

      const response = await send('post', '/api/users', validCreate, adminAuth);

      expect(response.statusCode).toBe(409);
      expect(response.body.message).toBe('Bu e-posta adresi zaten kayıtlı.');
    });
  });

  describe('PATCH /api/users/:id', () => {
    test.each([
      ['roles', { roles: ['ADMIN'] }],
      ['status', { status: 'INACTIVE' }],
      ['password', { password: 'YeniParola123!' }],
      ['passwordHash', { passwordHash: 'x' }],
      ['boş gövde', {}],
    ])('%s ile güncelleme 400 dönmeli', async (_, body) => {
      const response = await send('patch', `/api/users/${USER_ID}`, body, adminAuth);
      expect(response.statusCode).toBe(400);
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    test('departmentId null ile departmandan çıkarılabilmeli', async () => {
      const response = await send('patch', `/api/users/${USER_ID}`, { departmentId: null }, adminAuth);

      expect(response.statusCode).toBe(200);
      expect(userService.updateUser).toHaveBeenCalledWith(
        USER_ID,
        { departmentId: null },
        expect.objectContaining({ id: ADMIN_ID })
      );
    });
  });

  describe('Durum ve rol uç noktaları', () => {
    test('Geçersiz durum 400', async () => {
      const response = await send('patch', `/api/users/${USER_ID}/status`, { status: 'DELETED' }, adminAuth);
      expect(response.statusCode).toBe(400);
    });

    test('Rol listesi servise iletilmeli', async () => {
      await send('put', `/api/users/${USER_ID}/roles`, { roles: ['EMPLOYEE', 'RECEPTION'] }, adminAuth);
      expect(userService.setUserRoles).toHaveBeenCalledWith(
        USER_ID,
        ['EMPLOYEE', 'RECEPTION'],
        expect.objectContaining({ id: ADMIN_ID })
      );
    });

    test.each([
      ['get', '/api/users/abc'],
      ['patch', '/api/users/abc/status'],
      ['put', '/api/users/abc/roles'],
    ])('Geçersiz id (%s %s) 404 dönmeli', async (method, path) => {
      const response = await send(method, path, { status: 'ACTIVE', roles: ['EMPLOYEE'] }, adminAuth);
      expect(response.statusCode).toBe(404);
    });
  });
});
