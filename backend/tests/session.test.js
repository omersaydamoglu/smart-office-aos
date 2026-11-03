require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const requireAuth = require('../src/middleware/requireAuth');
const { createSession, verifyAccessToken } = require('../src/services/tokenService');

const TEST_EMAIL = 'token-test@smartoffice.test';
const REFRESH_URL = '/api/auth/refresh';
const LOGOUT_URL = '/api/auth/logout';

function refreshCookie(token) {
  return `refreshToken=${token}`;
}

function hashOf(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function tokenFromResponse(response) {
  const cookie = response.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
  return cookie.split(';')[0].split('=')[1];
}

describe('Oturum ve token API testleri', () => {
  let user;

  async function newSession() {
    const { refreshToken } = await createSession(user, ['EMPLOYEE']);
    return refreshToken;
  }

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    const role = await prisma.role.upsert({
      where: { name: 'EMPLOYEE' },
      update: {},
      create: { name: 'EMPLOYEE', description: 'Calisan' },
    });
    user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        passwordHash: 'test-hash',
        firstName: 'Token',
        lastName: 'Test',
        roles: { create: { roleId: role.id } },
      },
    });
  });

  afterEach(async () => {
    await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/refresh', () => {
    test('gecerli refresh ile yeni access token doner ve cookie yenilenir', async () => {
      const refreshToken = await newSession();

      const response = await request(app).post(REFRESH_URL).set('Cookie', refreshCookie(refreshToken));

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toEqual({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 900,
      });
      expect(response.body.data).not.toHaveProperty('refreshToken');

      const payload = verifyAccessToken(response.body.data.accessToken);
      expect(payload.sub).toBe(user.id);
      expect(payload.roles).toEqual(['EMPLOYEE']);

      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/api\/auth/);
      expect(tokenFromResponse(response)).not.toBe(refreshToken);
    });

    test('veritabaninda refresh tokenin kendisi saklanmaz', async () => {
      const refreshToken = await newSession();

      const session = await prisma.session.findFirst({ where: { userId: user.id } });

      expect(session.refreshTokenHash).toBe(hashOf(refreshToken));
      expect(session.refreshTokenHash).not.toBe(refreshToken);
    });

    test('cookie yoksa 401 doner', async () => {
      const response = await request(app).post(REFRESH_URL);

      expect(response.statusCode).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    test('bilinmeyen token 401 doner', async () => {
      const response = await request(app).post(REFRESH_URL).set('Cookie', refreshCookie('bilinmeyen'));

      expect(response.statusCode).toBe(401);
    });

    test('suresi dolmus refresh 401 doner', async () => {
      const refreshToken = await newSession();
      await prisma.session.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const response = await request(app).post(REFRESH_URL).set('Cookie', refreshCookie(refreshToken));

      expect(response.statusCode).toBe(401);
    });

    test('pasif kullanici refresh yapamaz', async () => {
      const refreshToken = await newSession();
      await prisma.user.update({ where: { id: user.id }, data: { status: 'INACTIVE' } });

      const response = await request(app).post(REFRESH_URL).set('Cookie', refreshCookie(refreshToken));

      expect(response.statusCode).toBe(401);
    });

    test('kullanilmis token tekrar gelirse tum oturumlar kapanir', async () => {
      const firstToken = await newSession();
      const otherDeviceToken = await newSession();
      const rotated = await request(app).post(REFRESH_URL).set('Cookie', refreshCookie(firstToken));
      const newToken = tokenFromResponse(rotated);

      const reuse = await request(app).post(REFRESH_URL).set('Cookie', refreshCookie(firstToken));
      expect(reuse.statusCode).toBe(401);

      for (const token of [newToken, otherDeviceToken]) {
        const response = await request(app).post(REFRESH_URL).set('Cookie', refreshCookie(token));
        expect(response.statusCode).toBe(401);
      }
    });

    test('es zamanli iki istekten yalnizca biri basarili olur', async () => {
      const refreshToken = await newSession();

      const responses = await Promise.all([
        request(app).post(REFRESH_URL).set('Cookie', refreshCookie(refreshToken)),
        request(app).post(REFRESH_URL).set('Cookie', refreshCookie(refreshToken)),
      ]);

      const successCount = responses.filter((r) => r.statusCode === 200).length;
      expect(successCount).toBeLessThanOrEqual(1);
    });

    test('izin verilmeyen originden gelen istek 403 doner', async () => {
      const refreshToken = await newSession();

      const response = await request(app)
        .post(REFRESH_URL)
        .set('Origin', 'https://kotu-site.example')
        .set('Cookie', refreshCookie(refreshToken));

      expect(response.statusCode).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    test('izin verilen originden gelen istek kabul edilir', async () => {
      const refreshToken = await newSession();

      const response = await request(app)
        .post(REFRESH_URL)
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', refreshCookie(refreshToken));

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('cikista refresh gecersiz olur ve cookie temizlenir', async () => {
      const refreshToken = await newSession();

      const logout = await request(app).post(LOGOUT_URL).set('Cookie', refreshCookie(refreshToken));

      expect(logout.statusCode).toBe(200);
      expect(logout.body.data.message).toBe('Oturum kapatıldı.');
      expect(logout.headers['set-cookie'][0]).toMatch(/^refreshToken=;/);

      const refresh = await request(app).post(REFRESH_URL).set('Cookie', refreshCookie(refreshToken));
      expect(refresh.statusCode).toBe(401);
    });

    test('cookie yoksa 401 doner', async () => {
      const response = await request(app).post(LOGOUT_URL);

      expect(response.statusCode).toBe(401);
    });
  });

  describe('requireAuth', () => {
    const protectedApp = express();
    protectedApp.get('/korumali', requireAuth, (req, res) => res.json(req.user));

    test('gecerli access token ile gecer', async () => {
      const { accessToken } = await createSession(user, ['EMPLOYEE']);

      const response = await request(protectedApp)
        .get('/korumali')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ id: user.id, roles: ['EMPLOYEE'] });
    });

    test('suresi dolmus access token 401 doner', async () => {
      const expired = jwt.sign({ roles: ['EMPLOYEE'] }, process.env.JWT_SECRET, {
        subject: user.id,
        expiresIn: -10,
      });

      const response = await request(protectedApp)
        .get('/korumali')
        .set('Authorization', `Bearer ${expired}`);

      expect(response.statusCode).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    test('token yoksa 401 doner', async () => {
      const response = await request(protectedApp).get('/korumali');

      expect(response.statusCode).toBe(401);
    });

    test('yanlis anahtarla imzalanmis token 401 doner', async () => {
      const forged = jwt.sign({ roles: ['ADMIN'] }, 'baska-anahtar', { subject: user.id });

      const response = await request(protectedApp)
        .get('/korumali')
        .set('Authorization', `Bearer ${forged}`);

      expect(response.statusCode).toBe(401);
    });

    test('alg none ile uretilmis token 401 doner', async () => {
      const unsigned = jwt.sign({ roles: ['ADMIN'] }, '', { subject: user.id, algorithm: 'none' });

      const response = await request(protectedApp)
        .get('/korumali')
        .set('Authorization', `Bearer ${unsigned}`);

      expect(response.statusCode).toBe(401);
    });
  });
});
