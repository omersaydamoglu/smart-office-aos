const { verifyAccessToken } = require('../services/tokenService');

function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  try {
    if (scheme !== 'Bearer' || !token) {
      throw new Error('Token yok');
    }
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, roles: payload.roles };
  } catch {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Oturum geçersiz veya süresi dolmuş.' },
    });
  }

  return next();
}

module.exports = requireAuth;
