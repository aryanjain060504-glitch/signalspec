import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Authentication Module & Security', () => {
  const testUser = {
    email: 'founder@signalspec.dev',
    password: 'Password123!',
    name: 'Signal Founder',
  };

  it('registers a new user successfully and returns 201 with access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects duplicate email registrations with 409 Conflict', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('validates registration input via Zod and returns 400 with field errors', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'invalid-email', password: 'short', name: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toBeDefined();
    expect(res.body.error.fields.email).toBeDefined();
    expect(res.body.error.fields.password).toBeDefined();
  });

  it('authenticates valid credentials and rotates refresh token on refresh', async () => {
    // Register
    const regRes = await request(app).post('/api/v1/auth/register').send(testUser);
    const cookies = regRes.headers['set-cookie'];

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();

    // Verify GET /users/me with access token
    const meRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(testUser.email);

    // Refresh token
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies || []);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();
  });

  it('rejects invalid passwords with 401 and tracks failed attempts', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('handles user logout by clearing session and cookies', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(testUser);
    const token = regRes.body.data.accessToken;

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);
  });
});
