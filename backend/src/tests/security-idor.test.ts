import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Security, IDOR Protection & GDPR Compliance', () => {
  let userAToken: string;
  let userBToken: string;
  let userAProjectId: string;

  beforeEach(async () => {
    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      email: 'user-a@signalspec.dev',
      password: 'Password123!',
      name: 'User A',
    });
    userAToken = resA.body.data.accessToken;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      email: 'user-b@signalspec.dev',
      password: 'Password123!',
      name: 'User B',
    });
    userBToken = resB.body.data.accessToken;

    // User A creates a project
    const projRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: "User A's Secret Project" });

    userAProjectId = projRes.body.data._id;
  });

  it('liveness (/health) and readiness (/ready) respond with 200 without auth', async () => {
    const healthRes = await request(app).get('/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('healthy');

    const readyRes = await request(app).get('/ready');
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('ready');
  });

  it('prevents IDOR: User B accessing User A project returns 404 (never 403 or 200)', async () => {
    const getRes = await request(app)
      .get(`/api/v1/projects/${userAProjectId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(getRes.status).toBe(404);
    expect(getRes.body.success).toBe(false);
    expect(getRes.body.error.code).toBe('NOT_FOUND');

    const deleteRes = await request(app)
      .delete(`/api/v1/projects/${userAProjectId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(deleteRes.status).toBe(404);
  });

  it('exports user data for GDPR portability', async () => {
    const exportRes = await request(app)
      .get('/api/v1/users/me/export')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.body.data.user.email).toBe('user-a@signalspec.dev');
    expect(exportRes.body.data.projects.length).toBe(1);
  });

  it('enforces confirmation text on account deletion', async () => {
    const failRes = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ confirmText: 'WRONG_TEXT' });

    expect(failRes.status).toBe(400);

    const successRes = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ confirmText: 'DELETE MY ACCOUNT' });

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
  });
});
