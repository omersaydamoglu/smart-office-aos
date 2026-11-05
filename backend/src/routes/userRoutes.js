
const express = require('express');

const {
  authenticateToken,
  authorizeRoles,
} = require('../middleware/authMiddleware');

const router = express.Router();

// Giriş yapmış kullanıcının kendi bilgileri
router.get('/me', authenticateToken, (req, res) => {
  return res.status(200).json({
    message: 'Kullanıcı bilgileri başarıyla getirildi.',
    data: {
      id: req.user.id,
      email: req.user.email,
      roles: req.user.roles,
    },
  });
});

// Sadece ADMIN rolüne sahip kullanıcılar erişebilir
router.get(
  '/admin',
  authenticateToken,
  authorizeRoles('ADMIN'),
  (req, res) => {
    return res.status(200).json({
      message: 'Admin erişimi başarılı.',
      data: {
        userId: req.user.id,
        roles: req.user.roles,
      },
    });
  }
);

module.exports = router;
