const {
  jwt,
  JWT_SECRET,
} = require('../config/jwt');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Kimlik doğrulama gerekli.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      roles: decoded.roles || [],
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Geçersiz veya süresi dolmuş token.',
    });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Kimlik doğrulama gerekli.',
      });
    }

    const hasPermission = req.user.roles.some((role) =>
      allowedRoles.includes(role)
    );

    if (!hasPermission) {
      return res.status(403).json({
        message: 'Bu işlem için yetkiniz bulunmuyor.',
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};