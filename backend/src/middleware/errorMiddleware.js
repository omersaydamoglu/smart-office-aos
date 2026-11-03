
function errorMiddleware(err, req, res, next) {
  console.error('API Hatası:', {
    message: err.message,
    method: req.method,
    path: req.originalUrl,
  });

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;

  const safeStatusCode =
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 599
      ? statusCode
      : 500;

  const message =
    safeStatusCode === 500
      ? 'Sunucu hatası oluştu.'
      : err.message || 'Bir hata oluştu.';

  return res.status(safeStatusCode).json({
    success: false,
    message,
  });
}

module.exports = errorMiddleware;
