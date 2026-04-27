const request = require('supertest');
const app = require('../src/index');

describe('POST /api/auth/login', () => {
  test('returns 200 and a JWT token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@shell.om', password: 'password' });

    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
  });

  test('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@shell.om', password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  test('returned token contains role and department', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@shell.om', password: 'password' });

    const payload = JSON.parse(
      Buffer.from(res.body.token.split('.')[1], 'base64').toString()
    );
    expect(payload.role).toBe('Admin');
    expect(payload.department).toBe('IT');
  });

  test('rejects login if email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password' });

    expect(res.statusCode).toBe(400);
  });
});
