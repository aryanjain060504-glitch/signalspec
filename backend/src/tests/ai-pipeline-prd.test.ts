import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('AI Analysis Pipeline & PRD Generation', () => {
  let authToken: string;
  let projectId: string;

  beforeEach(async () => {
    // 1. Register user
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: 'founder-ai@signalspec.dev',
      password: 'Password123!',
      name: 'AI Founder',
    });
    authToken = regRes.body.data.accessToken;

    // 2. Create project
    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Task Tracker SaaS' });
    projectId = projectRes.body.data._id;

    // 3. Import realistic SaaS customer reviews
    await request(app)
      .post(`/api/v1/projects/${projectId}/reviews/import`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reviews: [
          {
            reviewText:
              'Users struggle to understand task dependencies. It is so confusing when blockers occur.',
            product: 'CompetitorApp',
            rating: 1,
            source: 'G2',
          },
          {
            reviewText:
              'Dependency management is awful and clunky. Downstream impact of delayed tasks is impossible to see.',
            product: 'CompetitorApp',
            rating: 2,
            source: 'G2',
          },
          {
            reviewText:
              'Reporting limitations are frustrating. Cannot export custom CSV metrics for board meetings.',
            product: 'CompetitorApp',
            rating: 2,
            source: 'Capterra',
          },
          {
            reviewText: 'Great customer support team, but the mobile experience is buggy.',
            product: 'CompetitorApp',
            rating: 3,
            source: 'Trustpilot',
          },
        ],
      });
  });

  it('runs AI analysis pipeline and generates scored opportunities and pain points', async () => {
    // Start analysis
    const analyzeRes = await request(app)
      .post(`/api/v1/projects/${projectId}/analyze`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(analyzeRes.status).toBe(202);
    expect(analyzeRes.body.data.status).toBeDefined();

    // Small wait for local async pipeline to finish
    await new Promise((r) => setTimeout(r, 800));

    // Fetch generated pain points
    const painPointsRes = await request(app)
      .get(`/api/v1/projects/${projectId}/pain-points`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(painPointsRes.status).toBe(200);
    expect(painPointsRes.body.data.length).toBeGreaterThan(0);

    const firstPainPoint = painPointsRes.body.data[0];
    expect(firstPainPoint.title).toBeDefined();
    expect(firstPainPoint.severity).toBeDefined();
    expect(firstPainPoint.evidenceReviewIds.length).toBeGreaterThan(0);

    // Fetch generated opportunities (PRD Section 16 & 17)
    const oppsRes = await request(app)
      .get(`/api/v1/projects/${projectId}/opportunities`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(oppsRes.status).toBe(200);
    expect(oppsRes.body.data.length).toBeGreaterThan(0);

    const topOpp = oppsRes.body.data[0];
    expect(topOpp.score).toBeGreaterThan(0);
    expect(topOpp.scoreBreakdown).toBeDefined();
    expect(topOpp.scoreBreakdown.explanation).toBeDefined();
    expect(topOpp.status).toBe('open');
  });

  it('generates, updates, and exports an evidence-grounded PRD from an opportunity', async () => {
    // Trigger analysis first
    await request(app)
      .post(`/api/v1/projects/${projectId}/analyze`)
      .set('Authorization', `Bearer ${authToken}`);

    await new Promise((r) => setTimeout(r, 800));

    const oppsRes = await request(app)
      .get(`/api/v1/projects/${projectId}/opportunities`)
      .set('Authorization', `Bearer ${authToken}`);

    const targetOpportunity = oppsRes.body.data[0];
    expect(targetOpportunity).toBeDefined();

    // Generate PRD (PRD Section 19)
    const prdRes = await request(app)
      .post(`/api/v1/opportunities/${targetOpportunity._id}/generate-prd`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(prdRes.status).toBe(201);
    expect(prdRes.body.data.title).toContain('PRD:');
    expect(prdRes.body.data.problemStatement).toBeDefined();
    expect(prdRes.body.data.userStories.length).toBeGreaterThan(0);
    expect(prdRes.body.data.functionalRequirements.length).toBeGreaterThan(0);
    expect(prdRes.body.data.evidenceQuotes.length).toBeGreaterThan(0);

    const prdId = prdRes.body.data._id;

    // Update PRD section
    const updatePrdRes = await request(app)
      .patch(`/api/v1/prds/${prdId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        goals: ['Accelerate sprint velocity by 30%', 'Eliminate blocker confusion'],
      });

    expect(updatePrdRes.status).toBe(200);
    expect(updatePrdRes.body.data.version).toBe(2);
    expect(updatePrdRes.body.data.goals.length).toBe(2);

    // Export PRD as Markdown
    const exportMarkdownRes = await request(app)
      .get(`/api/v1/prds/${prdId}/export?format=markdown`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(exportMarkdownRes.status).toBe(200);
    expect(exportMarkdownRes.headers['content-type']).toContain('text/markdown');
    expect(exportMarkdownRes.text).toContain('# PRD:');

    // Export PRD as JSON
    const exportJsonRes = await request(app)
      .get(`/api/v1/prds/${prdId}/export?format=json`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(exportJsonRes.status).toBe(200);
    expect(exportJsonRes.headers['content-type']).toContain('application/json');
  });
});
