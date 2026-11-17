jest.mock('../src/services/departmentService', () => ({
  listDepartments: jest.fn(),
  getDepartment: jest.fn(),
  createDepartment: jest.fn(),
  updateDepartment: jest.fn(),
  setDepartmentManager: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const departmentService = require('../src/services/departmentService');

const DEPT_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';

function auth(roles, sub = USER_ID) {
  const token = jwt.sign({ sub, email: 't@smartoffice.test', roles }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
  return `Bearer ${token}`;
}

function send(method, path, body, authorization) {
  let req = request(app)[method](path);
  if (authorization) req = req.set('Authorization', authorization);
  return body ? req.send(body) : req;
}

const adminOnlyEndpoints = [
  ['post', '/api/departments', { name: 'Yeni' }],
  ['patch', `/api/departments/${DEPT_ID}`, { name: 'Yeni ad' }],
  ['put', `/api/departments/${DEPT_ID}/manager`, { managerId: USER_ID }],
];

describe('Departman route testleri (#39)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    departmentService.listDepartments.mockResolvedValue({ data: [], pagination: {} });
    departmentService.getDepartment.mockResolvedValue({ id: DEPT_ID });
    departmentService.createDepartment.mockResolvedValue({ id: DEPT_ID });
    departmentService.updateDepartment.mockResolvedValue({ id: DEPT_ID });
    departmentService.setDepartmentManager.mockResolvedValue({ id: DEPT_ID });
  });

  describe('Yetki', () => {
    test.each([
      ['get', '/api/departments', undefined],
      ['get', `/api/departments/${DEPT_ID}`, undefined],
      ...adminOnlyEndpoints,
    ])('%s %s tokensiz 401', async (method, path, body) => {
      const response = await send(method, path, body);
      expect(response.statusCode).toBe(401);
    });

    test.each(
      ['RECEPTION', 'DEPT_MANAGER', 'EMPLOYEE'].flatMap((role) =>
        adminOnlyEndpoints.map(([method, path, body]) => [role, method, path, body])
      )
    )('%s rolü %s %s için 403 almalı', async (role, method, path, body) => {
      const response = await send(method, path, body, auth([role]));
      expect(response.statusCode).toBe(403);
    });

    test.each(adminOnlyEndpoints)('ADMIN %s %s erişebilmeli', async (method, path, body) => {
      const response = await send(method, path, body, auth(['ADMIN']));
      expect([200, 201]).toContain(response.statusCode);
    });

    test.each(['EMPLOYEE', 'RECEPTION'])('%s departman detayına erişememeli (403)', async (role) => {
      const response = await send('get', `/api/departments/${DEPT_ID}`, undefined, auth([role]));
      expect(response.statusCode).toBe(403);
      expect(departmentService.getDepartment).not.toHaveBeenCalled();
    });

    test('DEPT_MANAGER detay isteği servise kendi kimliğiyle iletilmeli', async () => {
      await send('get', `/api/departments/${DEPT_ID}`, undefined, auth(['DEPT_MANAGER']));
      expect(departmentService.getDepartment).toHaveBeenCalledWith(DEPT_ID, {
        id: USER_ID,
        roles: ['DEPT_MANAGER'],
        isAdmin: false,
      });
    });

    test.each([
      ['ADMIN', true],
      ['EMPLOYEE', false],
      ['RECEPTION', false],
      ['DEPT_MANAGER', false],
    ])('%s listeye erişebilmeli (isAdmin=%s)', async (role, isAdmin) => {
      const response = await send('get', '/api/departments', undefined, auth([role]));

      expect(response.statusCode).toBe(200);
      expect(departmentService.listDepartments).toHaveBeenCalledWith(
        { page: 1, limit: 20 },
        expect.objectContaining({ isAdmin })
      );
    });
  });

  describe('Doğrulama', () => {
    test('isActive sorgusu boolean a çevrilmeli', async () => {
      await send('get', '/api/departments?isActive=false', undefined, auth(['ADMIN']));
      expect(departmentService.listDepartments.mock.calls[0][0].isActive).toBe(false);
    });

    test.each(['limit=0', 'isActive=evet'])('Geçersiz sorgu (%s) 400', async (query) => {
      const response = await send('get', `/api/departments?${query}`, undefined, auth(['ADMIN']));
      expect(response.statusCode).toBe(400);
    });

    test.each([
      ['boş ad', { name: '   ' }],
      ['çok uzun ad', { name: 'x'.repeat(101) }],
      ['bilinmeyen alan', { name: 'A', managerId: USER_ID }],
    ])('POST %s 400', async (_, body) => {
      const response = await send('post', '/api/departments', body, auth(['ADMIN']));
      expect(response.statusCode).toBe(400);
      expect(departmentService.createDepartment).not.toHaveBeenCalled();
    });

    test('POST ad baştaki/sondaki boşluklardan arındırılmalı', async () => {
      await send('post', '/api/departments', { name: '  Muhasebe  ' }, auth(['ADMIN']));
      expect(departmentService.createDepartment.mock.calls[0][0]).toEqual({ name: 'Muhasebe' });
    });

    test.each([
      ['managerId', { managerId: USER_ID }],
      ['boş gövde', {}],
      ['isActive metin', { isActive: 'false' }],
    ])('PATCH %s 400', async (_, body) => {
      const response = await send('patch', `/api/departments/${DEPT_ID}`, body, auth(['ADMIN']));
      expect(response.statusCode).toBe(400);
      expect(departmentService.updateDepartment).not.toHaveBeenCalled();
    });

    test('Yönetici null ile kaldırılabilmeli', async () => {
      const response = await send('put', `/api/departments/${DEPT_ID}/manager`, { managerId: null }, auth(['ADMIN']));

      expect(response.statusCode).toBe(200);
      expect(departmentService.setDepartmentManager).toHaveBeenCalledWith(
        DEPT_ID,
        null,
        expect.objectContaining({ id: USER_ID })
      );
    });

    test.each([{ managerId: 'abc' }, {}])('Geçersiz yönetici gövdesi %j 400', async (body) => {
      const response = await send('put', `/api/departments/${DEPT_ID}/manager`, body, auth(['ADMIN']));
      expect(response.statusCode).toBe(400);
    });

    test('Geçersiz id 404', async () => {
      const response = await send('get', '/api/departments/abc', undefined, auth(['ADMIN']));
      expect(response.statusCode).toBe(404);
    });

    test('Servisten gelen 409 iletilmeli', async () => {
      const error = new Error('Bu isimde bir departman zaten var.');
      error.statusCode = 409;
      departmentService.createDepartment.mockRejectedValue(error);

      const response = await send('post', '/api/departments', { name: 'Genel' }, auth(['ADMIN']));

      expect(response.statusCode).toBe(409);
      expect(response.body.message).toBe('Bu isimde bir departman zaten var.');
    });
  });
});
