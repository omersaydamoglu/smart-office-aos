const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const SECRET = process.env.JWT_SECRET;
const ROLES = ['ADMIN', 'RECEPTION', 'DEPT_MANAGER', 'EMPLOYEE'];

function tokenFor(roles, options = {}, secret = SECRET) {
  return jwt.sign(
    { sub: 'user-1', email: 'test@smartoffice.test', roles },
    secret,
    { expiresIn: '15m', ...options }
  );
}

describe('RBAC route testleri (/api/users)', () => {
  describe('GET /api/users/me', () => {
    test.each(ROLES)('%s rolü kendi bilgilerine erişebilmeli', async (role) => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokenFor([role])}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.roles).toEqual([role]);
    });

    test('Token olmadan 401 dönmeli', async () => {
      const response = await request(app).get('/api/users/me');
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/users/admin', () => {
    test('ADMIN rolü erişebilmeli', async () => {
      const response = await request(app)
        .get('/api/users/admin')
        .set('Authorization', `Bearer ${tokenFor(['ADMIN'])}`);

      expect(response.statusCode).toBe(200);
    });

    test.each(['RECEPTION', 'DEPT_MANAGER', 'EMPLOYEE'])(
      '%s rolü 403 almalı',
      async (role) => {
        const response = await request(app)
          .get('/api/users/admin')
          .set('Authorization', `Bearer ${tokenFor([role])}`);

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe('Bu işlem için yetkiniz bulunmuyor.');
      }
    );

    test('Rolsüz token 403 almalı', async () => {
      const response = await request(app)
        .get('/api/users/admin')
        .set('Authorization', `Bearer ${tokenFor([])}`);

      expect(response.statusCode).toBe(403);
    });

    test('Token olmadan 401 dönmeli', async () => {
      const response = await request(app).get('/api/users/admin');
      expect(response.statusCode).toBe(401);
    });
  });

  describe('Access token doğrulama', () => {
    test('Süresi dolmuş token 401 almalı', async () => {
      const expired = tokenFor(['ADMIN'], { expiresIn: -10 });

      const response = await request(app)
        .get('/api/users/admin')
        .set('Authorization', `Bearer ${expired}`);

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Geçersiz veya süresi dolmuş token.');
    });

    test('Başka anahtarla imzalanmış token 401 almalı', async () => {
      const forged = tokenFor(['ADMIN'], {}, 'baska-bir-anahtar-en-az-32-karakter-uzunlugunda');

      const response = await request(app)
        .get('/api/users/admin')
        .set('Authorization', `Bearer ${forged}`);

      expect(response.statusCode).toBe(401);
    });

    test('Rolü sonradan ADMIN yapılmış token 401 almalı', async () => {
      const [header, , signature] = tokenFor(['EMPLOYEE']).split('.');
      const payload = Buffer.from(
        JSON.stringify({ sub: 'user-1', roles: ['ADMIN'], exp: Math.floor(Date.now() / 1000) + 900 })
      ).toString('base64url');

      const response = await request(app)
        .get('/api/users/admin')
        .set('Authorization', `Bearer ${header}.${payload}.${signature}`);

      expect(response.statusCode).toBe(401);
    });

    test('İmzasız (alg: none) token 401 almalı', async () => {
      const unsigned = jwt.sign({ sub: 'user-1', roles: ['ADMIN'] }, null, { algorithm: 'none' });

      const response = await request(app)
        .get('/api/users/admin')
        .set('Authorization', `Bearer ${unsigned}`);

      expect(response.statusCode).toBe(401);
    });
  });
});
