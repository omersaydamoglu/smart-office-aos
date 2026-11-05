
jest.mock('../src/config/prisma', () => ({
  user: {
    findUnique: jest.fn(),
  },
  loginAttempt: {
    create: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../src/config/jwt', () => ({
  jwt: {
    sign: jest.fn(() => 'test-access-token'),
  },
  JWT_SECRET: 'test-secret-only-for-unit-tests',
  ACCESS_TOKEN_EXPIRES_IN: '15m',
}));

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../src/config/prisma');

const {
  login,
  refreshSession,
  logout,
} = require('../src/services/authService');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('Authentication Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    prisma.loginAttempt.create.mockResolvedValue({});
    prisma.session.create.mockResolvedValue({});
    prisma.session.update.mockResolvedValue({});
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
  });

  test('Doğru bilgilerle giriş başarılı olmalı', async () => {
    const passwordHash = await bcrypt.hash('Test123!', 10);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'admin@smartoffice.test',
      passwordHash,
      status: 'ACTIVE',
      firstName: 'Test',
      lastName: 'Admin',
      roles: [{ role: { name: 'ADMIN' } }],
      department: { name: 'Genel' },
    });

    const result = await login({
      email: 'admin@smartoffice.test',
      password: 'Test123!',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result.accessToken).toBe('test-access-token');
    expect(result.refreshToken).toBeDefined();
    expect(result.user.roles).toEqual(['ADMIN']);

    expect(prisma.session.create).toHaveBeenCalledTimes(1);

    expect(prisma.loginAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        success: true,
      }),
    });
  });

  test('Yanlış şifreyle giriş reddedilmeli', async () => {
    const passwordHash = await bcrypt.hash('Correct123!', 10);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      passwordHash,
      status: 'ACTIVE',
    });

    await expect(
      login({
        email: 'admin@smartoffice.test',
        password: 'Wrong123!',
      })
    ).rejects.toThrow('E-posta veya şifre hatalı.');

    expect(prisma.session.create).not.toHaveBeenCalled();

    expect(prisma.loginAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        success: false,
      }),
    });
  });

  test('Olmayan kullanıcı giriş yapamamalı', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      login({
        email: 'unknown@smartoffice.test',
        password: 'Test123!',
      })
    ).rejects.toThrow('E-posta veya şifre hatalı.');

    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  test('Pasif kullanıcı giriş yapamamalı', async () => {
    const passwordHash = await bcrypt.hash('Test123!', 10);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-456',
      passwordHash,
      status: 'INACTIVE',
    });

    await expect(
      login({
        email: 'inactive@smartoffice.test',
        password: 'Test123!',
      })
    ).rejects.toThrow('E-posta veya şifre hatalı.');

    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  test('Refresh token ile yeni access ve refresh token üretilmeli', async () => {
    const oldToken = 'old-refresh-token';

    prisma.session.findUnique.mockResolvedValue({
      id: 'session-123',
      refreshTokenHash: hashToken(oldToken),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      user: {
        id: 'user-123',
        email: 'admin@smartoffice.test',
        status: 'ACTIVE',
        roles: [{ role: { name: 'ADMIN' } }],
      },
    });

    const result = await refreshSession({
      refreshToken: oldToken,
    });

    expect(result.accessToken).toBe('test-access-token');
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe(oldToken);

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-123',
        refreshTokenHash: hashToken(oldToken),
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
      data: {
        refreshTokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      },
    });

    expect(prisma.session.updateMany).toHaveReturnedTimes(1);
  });

  test('Eş zamanlı refresh isteğinde eski token ikinci kez kullanılamamalı', async () => {
    const oldToken = 'old-refresh-token';

    prisma.session.findUnique.mockResolvedValue({
      id: 'session-123',
      refreshTokenHash: hashToken(oldToken),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      user: {
        id: 'user-123',
        email: 'admin@smartoffice.test',
        status: 'ACTIVE',
        roles: [{ role: { name: 'ADMIN' } }],
      },
    });

    prisma.session.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      refreshSession({ refreshToken: oldToken })
    ).rejects.toThrow('Geçersiz veya süresi dolmuş oturum.');

    expect(prisma.session.updateMany).toHaveBeenCalledTimes(1);
  });

  test('Geçersiz refresh token reddedilmeli', async () => {
    prisma.session.findUnique.mockResolvedValue(null);

    await expect(
      refreshSession({ refreshToken: 'invalid-token' })
    ).rejects.toThrow('Geçersiz veya süresi dolmuş oturum.');

    expect(prisma.session.updateMany).not.toHaveBeenCalled();
  });

  test('İptal edilmiş oturum yenilenememeli', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-123',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      user: {
        status: 'ACTIVE',
        roles: [],
      },
    });

    await expect(
      refreshSession({ refreshToken: 'revoked-token' })
    ).rejects.toThrow('Geçersiz veya süresi dolmuş oturum.');

    expect(prisma.session.updateMany).not.toHaveBeenCalled();
  });

  test('Logout oturumu iptal etmeli', async () => {
    await logout({
      refreshToken: 'logout-token',
    });

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        refreshTokenHash: hashToken('logout-token'),
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});
