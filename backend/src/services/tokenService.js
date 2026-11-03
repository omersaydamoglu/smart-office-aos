const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const JWT_ALGORITHM = 'HS256';

class InvalidRefreshTokenError extends Error {}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET tanimli degil');
  }
  return process.env.JWT_SECRET;
}

function signAccessToken(user, roles) {
  return jwt.sign({ roles }, getJwtSecret(), {
    subject: user.id,
    algorithm: JWT_ALGORITHM,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

// Gecersiz veya suresi dolmus token'da hata firlatir
function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] });
}

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('base64url');
}

// Veritabaninda refresh token'in kendisi degil, ozeti saklanir
function hashRefreshToken(refreshToken) {
  return crypto.createHash('sha256').update(refreshToken).digest('hex');
}

function buildSessionData(userId, refreshToken, meta = {}) {
  return {
    userId,
    refreshTokenHash: hashRefreshToken(refreshToken),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  };
}

// Giris basarili oldugunda cagrilir (#34)
async function createSession(user, roles, meta) {
  const refreshToken = generateRefreshToken();
  await prisma.session.create({ data: buildSessionData(user.id, refreshToken, meta) });
  return { accessToken: signAccessToken(user, roles), refreshToken };
}

function revokeAllUserSessions(userId) {
  return prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function rotateSession(refreshToken, meta) {
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashRefreshToken(refreshToken) },
    include: { user: { include: { roles: { include: { role: true } } } } },
  });
  if (!session) {
    throw new InvalidRefreshTokenError();
  }

  // Iptal edilmis token'in tekrar gelmesi calinti olabilir: tum oturumlar kapatilir
  if (session.revokedAt) {
    await revokeAllUserSessions(session.userId);
    throw new InvalidRefreshTokenError();
  }

  if (session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    throw new InvalidRefreshTokenError();
  }

  const newRefreshToken = generateRefreshToken();
  const rotated = await prisma.$transaction(async (tx) => {
    // Es zamanli iki istekten yalnizca biri eski oturumu tuketebilir
    const { count } = await tx.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count !== 1) {
      return false;
    }
    await tx.session.create({ data: buildSessionData(session.userId, newRefreshToken, meta) });
    return true;
  });
  if (!rotated) {
    await revokeAllUserSessions(session.userId);
    throw new InvalidRefreshTokenError();
  }

  const roles = session.user.roles.map((userRole) => userRole.role.name);
  return { accessToken: signAccessToken(session.user, roles), refreshToken: newRefreshToken };
}

function revokeSession(refreshToken) {
  return prisma.session.updateMany({
    where: { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_MS,
  InvalidRefreshTokenError,
  signAccessToken,
  verifyAccessToken,
  createSession,
  rotateSession,
  revokeSession,
};
