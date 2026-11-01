const request = require('supertest');
const app = require('../src/app');

describe('Health API Tests', () => {
  test('GET /api/health should return 200', async () => {
    const response = await request(app).get('/api/health');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('GET /api/unknown should return 404', async () => {
    const response = await request(app).get('/api/unknown');

    expect(response.statusCode).toBe(404);
  });
});
