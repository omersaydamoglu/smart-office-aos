
const express = require('express');
const { z } = require('zod');
const { rateLimit } = require('express-rate-limit');
const authService = require('../services/authService');
const csrfProtection = require('../middleware/csrfMiddleware');

const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production';

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/api/auth',
};

// Login için rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message:
      'Çok fazla giriş denemesi yaptınız. 15 dakika sonra tekrar deneyin.',
  },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// LOGIN
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Geçersiz e-posta veya şifre formatı.',
      });
    }

    const result = await authService.login({
      ...validation.data,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.cookie('refreshToken', result.refreshToken, {
      ...refreshCookieOptions,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return res.json({
      message: 'Giriş başarılı.',
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    if (error.message === 'E-posta veya şifre hatalı.') {
      return res.status(401).json({
        message: error.message,
      });
    }

    next(error);
  }
});

// REFRESH TOKEN
router.post('/refresh', csrfProtection, async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token bulunamadı.',
      });
    }

    const result = await authService.refreshSession({ refreshToken });

    res.cookie('refreshToken', result.refreshToken, {
      ...refreshCookieOptions,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return res.json({
      message: 'Token yenilendi.',
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    if (
      error.message === 'Geçersiz veya süresi dolmuş oturum.' ||
      error.message === 'Refresh token gerekli.'
    ) {
      res.clearCookie('refreshToken', refreshCookieOptions);

      return res.status(401).json({
        message: 'Oturum geçersiz veya süresi dolmuş.',
      });
    }

    next(error);
  }
});

// LOGOUT
router.post('/logout', csrfProtection, async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await authService.logout({ refreshToken });
    }

    res.clearCookie('refreshToken', refreshCookieOptions);

    return res.json({
      message: 'Çıkış başarılı.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
