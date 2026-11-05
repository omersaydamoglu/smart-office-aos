const allowedOrigins = ['http://localhost:5173'];

const csrfProtection = (req, res, next) => {
  const origin = req.get('origin');

  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      message: 'CSRF koruması: Bu isteğe izin verilmiyor.',
    });
  }

  next();
};

module.exports = csrfProtection;