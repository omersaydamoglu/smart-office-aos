const errorMiddleware = require('../src/middleware/errorMiddleware');

describe('Error Middleware Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/api/test',
    };

    res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('400 hatasında doğru mesaj dönmeli', () => {
    const error = new Error('Hatalı istek.');
    error.statusCode = 400;

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Hatalı istek.',
    });
  });

  test('401 hatasında doğru mesaj dönmeli', () => {
    const error = new Error('Kimlik doğrulama gerekli.');
    error.statusCode = 401;

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Kimlik doğrulama gerekli.',
    });
  });

  test('403 hatasında doğru mesaj dönmeli', () => {
    const error = new Error('Yetkiniz bulunmuyor.');
    error.statusCode = 403;

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Yetkiniz bulunmuyor.',
    });
  });

  test('404 hatasında doğru mesaj dönmeli', () => {
    const error = new Error('Kaynak bulunamadı.');
    error.statusCode = 404;

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Kaynak bulunamadı.',
    });
  });

  test('500 hatasında genel hata mesajı dönmeli', () => {
    const error = new Error('Database connection failed');

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Sunucu hatası oluştu.',
    });
  });

  test('Geçersiz durum kodu 500 olarak dönmeli', () => {
    const error = new Error('Invalid status');
    error.statusCode = 200;

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Sunucu hatası oluştu.',
    });
  });

  test('Header gönderilmişse next çağrılmalı', () => {
    const error = new Error('Headers already sent');
    res.headersSent = true;

    errorMiddleware(error, req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});