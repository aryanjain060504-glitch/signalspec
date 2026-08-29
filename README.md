# SignalSpec — AI-Powered Customer Review Discovery & PRD Generator

> **Turn customer reviews into product opportunities and actionable PRDs.**

SignalSpec is a discovery platform for indie SaaS founders and product teams. It analyses competitor and customer feedback to extract recurring pain points, prioritize product opportunities using explainable scoring, and generate evidence-grounded Product Requirements Documents (PRDs).

---

## Features

- **Evidence-First AI Pipeline**: Direct mapping from customer reviews → pain points → opportunities → PRDs with zero hallucinated quotes.
- **CSV & Text Ingestion**: Streaming CSV parser with fuzzy column matching and SHA-256 deduplication.
- **Explainable Scoring Engine**: Multi-factor scoring (Frequency, Severity, Negative Sentiment, Strategic Relevance, Confidence).
- **Comprehensive PRD Generator**: Generates 12 standard PRD sections (Problem statement, evidence quotes, user stories, functional requirements, user flows, edge cases, success metrics, acceptance criteria).
- **Export Formats**: One-click export to Markdown, structured JSON, and plain text.
- **Production-Grade Security**:
  - 15-minute access JWTs + 7-day rotated refresh tokens in HttpOnly cookies with token reuse breach revocation.
  - Rate limiting (Global + strict authentication limits).
  - NoSQL injection prevention with `express-mongo-sanitize`.
  - IDOR protection via strict `assertOwnership` (404 NOT_FOUND on tenant isolation violations).
  - Automated PII and secret redaction in Winston structured logs.
  - AES-256-GCM encryption for stored third-party credentials.
  - GDPR data export (`GET /api/v1/users/me/export`) and confirmed account deletion.
- **Real-Time Progress**: Live WebSocket notifications via Socket.IO for multi-stage analysis pipeline jobs.

---

## Architecture & Tech Stack

| Layer | Choice |
|---|---|
| **Runtime** | Node.js (Active LTS v24) |
| **Framework** | Express 5 |
| **Language** | TypeScript 5.8 (Strict mode) |
| **Database** | MongoDB Atlas / Mongoose 8 |
| **Validation** | Zod 3.24 |
| **AI Engine** | Google Gemini API (`@google/generative-ai`) with resilient deterministic local NLP fallback |
| **Testing** | Vitest 3 + Supertest + MongoMemoryServer |
| **Real-time** | Socket.IO 4.8 |
| **Logging** | Winston 3.17 (with automated redaction) |

---

## Quick Start (Backend)

### 1. Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- MongoDB instance (local or MongoDB Atlas connection URI)

### 2. Setup & Installation
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### 3. Run Tests
```bash
# Run unit & integration test suite
npm test
```

### 4. Start Development Server
```bash
# Start backend server with hot-reloading
npm run dev
```

The server will be available at `http://localhost:5000`.
- Health Check: `http://localhost:5000/health`
- API Root: `http://localhost:5000/api/v1`

---

## Postman API Collection

A fully configured Postman collection and environment template is located under `backend/postman/`:
1. Import `backend/postman/collection.json` into Postman.
2. Import `backend/postman/environment.json`.
3. Select the `SignalSpec Local Environment`. Pre-request and test scripts will automatically capture and chain JWT tokens, project IDs, job IDs, opportunity IDs, and PRD IDs across requests.

---

## Documentation

- [Project Architecture Blueprint](file:///d:/signalspec/docs/PROJECT_BLUEPRINT.md)
- [Backend API Specification](file:///d:/signalspec/docs/BACKEND_PLANNING.md)
- [Product Requirements Document (PRD)](file:///d:/signalspec/PRD.md)
