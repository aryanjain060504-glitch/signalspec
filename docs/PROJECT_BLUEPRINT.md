# SignalSpec — Technical Architecture Blueprint

**Version:** 1.0.0  
**Stack:** Node.js (v24 LTS), Express 5, TypeScript 5.8 (Strict), MongoDB / Mongoose 8, Zod, Socket.IO, Winston, Vitest.

---

## 1. System Architecture

SignalSpec is engineered around an **Evidence-First AI Discovery Pipeline**:
```
User Reviews (CSV / Text / API)
        │
        ▼
  Sanitization & SHA-256 Deduplication
        │
        ▼
  AI Review Analysis & SaaS Theme Extraction
        │
        ▼
  Recurring Pain Point Detection & Evidence Mapping
        │
        ▼
  Explainable Opportunity Scoring Engine (0 - 100)
        │
        ▼
  Human-in-the-Loop Review (Accept / Edit / Reject)
        │
        ▼
  Grounded PRD Generator & Multi-Format Exporter
```

---

## 2. Directory Structure

```
d:/signalspec/
├── docs/
│   ├── PROJECT_BLUEPRINT.md       # Architectural blueprint
│   └── BACKEND_PLANNING.md        # API contracts & data schemas
├── backend/
│   ├── src/
│   │   ├── config/                # Zod env validation, Mongoose DB connection, Passport
│   │   ├── middleware/            # requireAuth, validate, roleGuard, errorHandler
│   │   ├── modules/               # Domain modules (auth, users, projects, reviews, analysis, painPoints, opportunities, prds)
│   │   ├── services/              # AI service (Gemini + local engine), Email, Cron
│   │   ├── sockets/               # Real-time WebSocket event broadcaster with JWT guard
│   │   ├── utils/                 # JWT, timingSafeEqual, AES-256-GCM, ownershipCheck, scoring, csvParser
│   │   ├── types/                 # Express type augmentation
│   │   ├── app.ts                 # Express middleware chain & route mount
│   │   └── server.ts              # Entrypoint with graceful shutdown
│   ├── postman/
│   │   ├── collection.json        # Complete testable Postman collection
│   │   └── environment.json       # Postman environment template
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── .gitignore
├── .cursorignore
└── README.md
```

---

## 3. Security Implementation Checklist

| Category | Security Control | Implementation Details |
|---|---|---|
| **Auth** | Short-Lived JWT + HttpOnly Cookie | 15-min access token in response; 7-day refresh token in `HttpOnly; SameSite=Strict; Secure` cookie |
| **Auth** | Refresh Token Rotation | Bcrypt-hashed refresh tokens in DB; rotated on every use; token reuse triggers total user session revocation |
| **Auth** | Timing-Safe Compare | `crypto.timingSafeEqual` used for all token comparisons |
| **Auth** | Account Lockout | 5 failed login attempts lock account for 15 minutes |
| **API** | NoSQL Injection Defense | `express-mongo-sanitize` strips `$` and `.` operators from queries and body |
| **API** | Security Headers | `helmet()` enabled for secure HTTP headers |
| **API** | CORS | Explicit allowlist parsed from `CORS_ORIGINS` in env |
| **API** | Rate Limiting | Global limiter (200 req/min) + strict auth limiter (20 req/15 min) |
| **IDOR** | Resource Isolation | `assertOwnership` helper throws 404 NOT_FOUND (never 403) on cross-tenant resource access |
| **Data** | Encryption at Rest | Sensitive keys encrypted using AES-256-GCM with dynamic IV and authentication tags |
| **Data** | GDPR Compliance | Data portability export endpoint (`GET /api/v1/users/me/export`) and confirmed account deletion |
| **Logs** | PII & Secret Redaction | Winston logger automatically redacts passwords, tokens, API keys, and sensitive fields |
| **Infra** | Liveness & Readiness | `/health` (process check) and `/ready` (MongoDB connection verification) |
