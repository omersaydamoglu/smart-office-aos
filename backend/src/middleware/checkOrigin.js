const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

// Cookie kullanan istekleri baska sitelerden gelen CSRF denemelerine karsi korur.
// Origin basligi olmayan istekler tarayicidan gelmedigi icin cookie riski tasimaz.
function checkOrigin(req, res, next) {
  const { origin } = req.headers;

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Bu kaynaktan gelen isteğe izin verilmiyor.' },
    });
  }

  return next();
}

module.exports = { allowedOrigins, checkOrigin };
