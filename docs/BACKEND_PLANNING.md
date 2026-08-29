# SignalSpec — Backend API Specification & Data Contracts

## 1. Response Standard

### Standard Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Success Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed on request data",
    "fields": {
      "email": ["Please enter a valid email address"]
    }
  }
}
```

---

## 2. Master Endpoints Reference

### Authentication
- `POST /api/v1/auth/register` — Register a new founder account.
- `POST /api/v1/auth/login` — Authenticate credentials; sets HttpOnly refresh cookie.
- `POST /api/v1/auth/refresh` — Rotate refresh token and issue new 15-minute access token.
- `POST /api/v1/auth/logout` — Invalidate session and clear refresh cookie.
- `GET /api/v1/auth/sessions` — List active login sessions.
- `DELETE /api/v1/auth/sessions/:sessionId` — Terminate a specific session.

### Users
- `GET /api/v1/users/me` — Get current user profile.
- `PATCH /api/v1/users/me` — Update name or avatar.
- `GET /api/v1/users/me/export` — Export complete account data in JSON (GDPR).
- `DELETE /api/v1/users/me` — Delete account (requires `confirmText: "DELETE MY ACCOUNT"`).

### Projects & Competitors
- `POST /api/v1/projects` — Create research project.
- `GET /api/v1/projects` — List user's projects (paginated, searchable).
- `GET /api/v1/projects/:id` — Get project details by ID.
- `PATCH /api/v1/projects/:id` — Update project metadata.
- `DELETE /api/v1/projects/:id` — Soft-delete project and cascade delete resources.
- `GET /api/v1/projects/:id/dashboard` — Aggregated analytics (sentiment ratio, themes, top opportunities).
- `POST /api/v1/projects/:id/competitors` — Add competitor to project.
- `DELETE /api/v1/projects/:id/competitors/:competitorId` — Remove competitor.

### Reviews
- `POST /api/v1/projects/:id/reviews/import` — Ingest CSV file or JSON review batch with automatic SHA-256 deduplication.
- `GET /api/v1/projects/:id/reviews` — Paginated review listing with filters (sentiment, rating, competitor, theme, search).
- `GET /api/v1/reviews/:id` — Get single review details.
- `DELETE /api/v1/reviews/:id` — Delete a review.

### AI Analysis & Jobs
- `POST /api/v1/projects/:id/analyze` — Launch asynchronous review analysis pipeline with real-time Socket.IO updates.
- `GET /api/v1/projects/:id/jobs` — List analysis jobs for project.
- `GET /api/v1/analysis-jobs/:id` — Get status and progress percentage for a job.
- `POST /api/v1/analysis-jobs/:id/cancel` — Cancel pending/running job.

### Pain Points
- `GET /api/v1/projects/:id/pain-points` — List extracted pain points with severity breakdown.
- `GET /api/v1/pain-points/:id` — Get pain point detail with populated customer evidence reviews.
- `PATCH /api/v1/pain-points/:id` — Edit pain point title/severity/status.

### Opportunities
- `GET /api/v1/projects/:id/opportunities` — List generated opportunities ranked by score (0-100).
- `GET /api/v1/opportunities/:id` — Get opportunity detail with score breakdown and customer quotes.
- `PATCH /api/v1/opportunities/:id` — Accept, reject, or edit opportunity.
- `POST /api/v1/opportunities/:id/recalculate-score` — Recalculate score based on live project dataset.

### PRDs
- `POST /api/v1/opportunities/:id/generate-prd` — Generate complete 12-section evidence-backed PRD.
- `GET /api/v1/projects/:id/prds` — List generated PRDs for project.
- `GET /api/v1/prds/:id` — Get PRD specification.
- `PATCH /api/v1/prds/:id` — Update PRD sections and increment version.
- `DELETE /api/v1/prds/:id` — Delete PRD.
- `GET /api/v1/prds/:id/export?format=markdown|json|text` — Export formatted specification document.

### Health & Readiness
- `GET /health` — Liveness healthcheck (200 OK).
- `GET /ready` — Readiness check (200 OK when MongoDB is connected, 503 if disconnected).
