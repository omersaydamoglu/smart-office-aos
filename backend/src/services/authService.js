
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');

const {
  jwt,
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRES_IN,
} = require('../config/jwt');

const REFRESH_TOKEN_BYTES = 64;
const REFRESH_TOKEN_DAYS = 7;

function createAccessToken(user) {
  const roles = user.roles.map((item) => item.role.name);

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

function getRefreshTokenExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

async function login({ email, password, ipAddress, userAgent }) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      roles: { include: { role: true } },
      department: true,
    },
  });

  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  const success = Boolean(
    user && passwordMatches && user.status === 'ACTIVE'
  );

  await prisma.loginAttempt.create({
    data: {
      email: normalizedEmail,
      userId: user?.id || null,
      ipAddress,
      success,
    },
  });

  if (!success) {
    throw new Error('E-posta veya şifre hatalı.');
  }

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken();

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgent,
      ipAddress,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((item) => item.role.name),
      department: user.department?.name || null,
    },
  };
}

async function refreshSession({ refreshToken }) {
  if (!refreshToken) {
    throw new Error('Refresh token gerekli.');
  }

  const refreshTokenHash = hashRefreshToken(refreshToken);
  const now = new Date();

  const session = await prisma.session.findUnique({
    where: { refreshTokenHash },
    include: {
      user: {
        include: {
          roles: { include: { role: true } },
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    session.user.status !== 'ACTIVE'
  ) {
    throw new Error('Geçersiz veya süresi dolmuş oturum.');
  }

  const newRefreshToken = createRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const newExpiry = getRefreshTokenExpiry();

  // Atomik güncelleme: Eski token hâlâ geçerliyse yenile.
  const updateResult = await prisma.session.updateMany({
    where: {
      id: session.id,
      refreshTokenHash,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: newExpiry,
    },
  });

  // Başka bir istek tokenı önce yenilediyse bu istek başarısız olur.
  if (updateResult.count !== 1) {
    throw new Error('Geçersiz veya süresi dolmuş oturum.');
  }

  return {
    accessToken: createAccessToken(session.user),
    refreshToken: newRefreshToken,
  };
}

async function logout({ refreshToken }) {
  if (!refreshToken) {
    throw new Error('Refresh token gerekli.');
  }

  const refreshTokenHash = hashRefreshToken(refreshToken);

  // Yalnızca mevcut ve iptal edilmemiş oturumu iptal et.
  await prisma.session.updateMany({
    where: {
      refreshTokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

module.exports = {
  login,
  refreshSession,
  logout,
};
