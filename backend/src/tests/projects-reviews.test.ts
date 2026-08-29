import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Projects & Reviews Ingestion Module', () => {
  let authToken: string;

  beforeEach(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: 'test-pm@signalspec.dev',
      password: 'Password123!',
      name: 'Test PM',
    });
    authToken = regRes.body.data.accessToken;
  });

  it('creates and lists projects with competitors and metrics', async () => {
    // 1. Create project
    const createRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Project Management SaaS',
        description: 'Discovery for modern task management tool',
        targetIcp: 'Indie SaaS founders & small engineering teams',
        competitors: [
          { name: 'Linear', website: 'https://linear.app' },
          { name: 'Jira', website: 'https://atlassian.com/jira' },
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.name).toBe('Project Management SaaS');
    expect(createRes.body.data.competitors.length).toBe(2);

    const projectId = createRes.body.data._id;

    // 2. List projects
    const listRes = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.pagination.total).toBe(1);

    // 3. Add a competitor
    const addCompRes = await request(app)
      .post(`/api/v1/projects/${projectId}/competitors`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Asana', website: 'https://asana.com' });

    expect(addCompRes.status).toBe(201);
    expect(addCompRes.body.data.competitors.length).toBe(3);
  });

  it('imports CSV reviews, validates columns, deduplicates, and updates metrics', async () => {
    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'CRM Research' });

    const projectId = projectRes.body.data._id;

    const sampleCsv = `review_id,product,source,rating,review_text,date,author
rev-001,CompetitorA,G2,2,The dependency management interface is very confusing and hard to use,2026-01-10,Alex
rev-002,CompetitorA,G2,1,System freezes whenever we export large CSV reports. Very slow performance.,2026-01-12,Sam
rev-003,CompetitorB,Capterra,5,Great onboarding and fast customer support team!,2026-01-15,Taylor
rev-004,CompetitorA,G2,2,The dependency management interface is very confusing and hard to use,2026-01-16,Alex`; // Duplicate review

    const importRes = await request(app)
      .post(`/api/v1/projects/${projectId}/reviews/import`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from(sampleCsv), 'reviews.csv');

    expect(importRes.status).toBe(201);
    expect(importRes.body.data.insertedCount).toBe(3); // 1 duplicate filtered out
    expect(importRes.body.data.duplicateCount).toBe(1);

    // Verify reviews in project
    const reviewsRes = await request(app)
      .get(`/api/v1/projects/${projectId}/reviews`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(reviewsRes.status).toBe(200);
    expect(reviewsRes.body.data.length).toBe(3);

    // Verify project metrics updated
    const projectDetail = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(projectDetail.body.data.metrics.totalReviews).toBe(3);
  });

  it('imports raw JSON review items and calculates dashboard summary', async () => {
    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Analytics Tool Research' });

    const projectId = projectRes.body.data._id;

    const importRes = await request(app)
      .post(`/api/v1/projects/${projectId}/reviews/import`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reviews: [
          {
            reviewText: 'Pricing is way too expensive for small indie founders starting out.',
            product: 'ChartMogul',
            rating: 2,
          },
          {
            reviewText: 'Mobile app crashes constantly on iPad when loading dashboards.',
            product: 'Baremetrics',
            rating: 1,
          },
          {
            reviewText: 'Excellent API and webhook integration capabilities.',
            product: 'ChartMogul',
            rating: 5,
          },
        ],
      });

    expect(importRes.status).toBe(201);
    expect(importRes.body.data.insertedCount).toBe(3);

    // Check dashboard summary endpoint (PRD Section 23)
    const dashRes = await request(app)
      .get(`/api/v1/projects/${projectId}/dashboard`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.summary.totalReviews).toBe(3);
    expect(dashRes.body.data.summary.productsAnalyzed).toBe(2);
    expect(dashRes.body.data.products).toContain('ChartMogul');
  });
});
