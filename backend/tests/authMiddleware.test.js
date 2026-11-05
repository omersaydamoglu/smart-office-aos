
jest.mock('../src/config/jwt', () => ({
  jwt: {
    verify: jest.fn(),
  },
  JWT_SECRET: 'test-secret',
}));

const { jwt } = require('../src/config/jwt');

const {
  authenticateToken,
  authorizeRoles,
} = require('../src/middleware/authMiddleware');

describe('Authentication Middleware Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = { headers: {} };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  describe('authenticateToken', () => {
    test('Token yoksa 401 dönmeli', () => {
      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('Bearer formatı yoksa 401 dönmeli', () => {
      req.headers.authorization = 'InvalidToken';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('Geçerli token kabul edilmeli', () => {
      req.headers.authorization = 'Bearer valid-token';

      jwt.verify.mockReturnValue({
        sub: 'user-123',
        email: 'admin@test.com',
        roles: ['ADMIN'],
      });

      authenticateToken(req, res, next);

      expect(req.user).toEqual({
        id: 'user-123',
        email: 'admin@test.com',
        roles: ['ADMIN'],
      });

      expect(next).toHaveBeenCalledTimes(1);
    });

    test('Geçersiz token 401 dönmeli', () => {
      req.headers.authorization = 'Bearer invalid-token';

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Geçersiz veya süresi dolmuş token.',
      });

      expect(next).not.toHaveBeenCalled();
    });

    test('Roller bulunmayan token boş rol listesi oluşturmalı', () => {
      req.headers.authorization = 'Bearer valid-token';

      jwt.verify.mockReturnValue({
        sub: 'user-456',
        email: 'employee@test.com',
      });

      authenticateToken(req, res, next);

      expect(req.user.roles).toEqual([]);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('authorizeRoles', () => {
    test('ADMIN rolü erişebilmeli', () => {
      req.user = { roles: ['ADMIN'] };

      authorizeRoles('ADMIN')(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test('DEPT_MANAGER rolü erişebilmeli', () => {
      req.user = { roles: ['DEPT_MANAGER'] };

      authorizeRoles('DEPT_MANAGER')(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test('RECEPTION rolü erişebilmeli', () => {
      req.user = { roles: ['RECEPTION'] };

      authorizeRoles('RECEPTION')(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test('EMPLOYEE rolü erişebilmeli', () => {
      req.user = { roles: ['EMPLOYEE'] };

      authorizeRoles('EMPLOYEE')(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test('Yetkisiz rol 403 dönmeli', () => {
      req.user = { roles: ['EMPLOYEE'] };

      authorizeRoles('ADMIN')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Bu işlem için yetkiniz bulunmuyor.',
      });

      expect(next).not.toHaveBeenCalled();
    });

    test('Birden fazla izin verilen rolden biri yeterli olmalı', () => {
      req.user = { roles: ['RECEPTION'] };

      authorizeRoles('ADMIN', 'RECEPTION')(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test('Boş rol listesi 403 dönmeli', () => {
      req.user = { roles: [] };

      authorizeRoles('ADMIN')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('Kullanıcı doğrulanmamışsa 401 dönmeli', () => {
      authorizeRoles('ADMIN')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
