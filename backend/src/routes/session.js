const express = require('express');
const { checkOrigin } = require('../middleware/checkOrigin');
const {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_MS,
  InvalidRefreshTokenError,
  rotateSession,
  revokeSession,
} = require('../services/tokenService');

const REFRESH_COOKIE_NAME = 'refreshToken';

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
};

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

function sendUnauthenticated(res) {
  return res.status(401).json({
    error: { code: 'UNAUTHENTICATED', message: 'Oturum geçersiz veya süresi dolmuş.' },
  });
}

const router = express.Router();

router.use(checkOrigin);

router.post('/refresh', async (req, res) => {
  const currentToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!currentToken) {
    return sendUnauthenticated(res);
  }

  try {
    const { accessToken, refreshToken } = await rotateSession(currentToken, {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });
    setRefreshCookie(res, refreshToken);
    return res.json({
      data: { accessToken, tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    });
  } catch (err) {
    if (err instanceof InvalidRefreshTokenError) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
      return sendUnauthenticated(res);
    }
    throw err;
  }
});

router.post('/logout', async (req, res) => {
  const currentToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!currentToken) {
    return sendUnauthenticated(res);
  }

  await revokeSession(currentToken);
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
  return res.json({ data: { message: 'Oturum kapatıldı.' } });
});

module.exports = { router, setRefreshCookie };
