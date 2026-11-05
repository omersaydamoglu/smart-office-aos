jest.mock('../src/services/authService', () => ({
  login: jest.fn(),
  refreshSession: jest.fn(),
  logout: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const authService = require('../src/services/authService');

describe('Authentication Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('Doğru bilgilerle giriş başarılı olmalı', async () => {
      authService.login.mockResolvedValue({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        user: {
          id: 'user-123',
          email: 'admin@smartoffice.test',
          firstName: 'Test',
          lastName: 'Admin',
          roles: ['ADMIN'],
          department: 'Genel',
        },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@smartoffice.test',
          password: 'Admin123!dev',
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Giriş başarılı.');
      expect(response.body.data.accessToken).toBe('test-access-token');
      expect(response.body.data.user.email).toBe(
        'admin@smartoffice.test'
      );

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'].join(';')).toContain(
        'HttpOnly'
      );

      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    test('Geçersiz e-posta formatında 400 dönmeli', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'gecersiz-email',
          password: 'Test123!',
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(
        'Geçersiz e-posta veya şifre formatı.'
      );

      expect(authService.login).not.toHaveBeenCalled();
    });

    test('Yanlış bilgilerde 401 dönmeli', async () => {
      authService.login.mockRejectedValue(
        new Error('E-posta veya şifre hatalı.')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@smartoffice.test',
          password: 'WrongPassword123!',
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe(
        'E-posta veya şifre hatalı.'
      );
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('Refresh token olmadan 401 dönmeli', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Origin', 'http://localhost:5173');

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe(
        'Refresh token bulunamadı.'
      );

      expect(authService.refreshSession).not.toHaveBeenCalled();
    });

    test('CSRF kontrolünden geçmeyen istek 403 dönmeli', async () => {
      const response = await request(app)
        .post('/api/auth/refresh');

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe(
        'CSRF koruması: Bu isteğe izin verilmiyor.'
      );

      expect(authService.refreshSession).not.toHaveBeenCalled();
    });

    test('Geçerli refresh token ile access token yenilenmeli', async () => {
      authService.refreshSession.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', 'refreshToken=old-refresh-token');

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Token yenilendi.');
      expect(response.body.data.accessToken).toBe(
        'new-access-token'
      );

      expect(authService.refreshSession).toHaveBeenCalledWith({
        refreshToken: 'old-refresh-token',
      });

      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    test('Başarılı logout isteği oturumu kapatmalı', async () => {
      authService.logout.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', 'refreshToken=test-refresh-token');

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Çıkış başarılı.');

      expect(authService.logout).toHaveBeenCalledWith({
        refreshToken: 'test-refresh-token',
      });

      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('CSRF kontrolünden geçmeyen logout isteği 403 dönmeli', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.statusCode).toBe(403);

      expect(authService.logout).not.toHaveBeenCalled();
    });
  });

  describe('Login Rate Limiting', () => {
    test('6. giriş isteği 429 dönmeli', async () => {
      authService.login.mockRejectedValue(
        new Error('E-posta veya şifre hatalı.')
      );

      // Önceki login testleri 3 istek kullandı.
      // 4. ve 5. isteklerin 401 dönmesi bekleniyor.
      for (let i = 0; i < 2; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'admin@smartoffice.test',
            password: 'WrongPassword123!',
          });

        expect(response.statusCode).toBe(401);
      }

      // 6. istek rate limiter tarafından engellenmeli.
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@smartoffice.test',
          password: 'WrongPassword123!',
        });

      expect(response.statusCode).toBe(429);
      expect(response.body.message).toContain(
        'Çok fazla giriş denemesi'
      );
    });
  });
});
