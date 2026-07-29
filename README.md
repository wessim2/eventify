# Eventify

> A multi-tenant Tech-Event Operating System SaaS. Organizations can create, manage, and publish technology events through a control plane dashboard and a public storefront.

## Tech Stack

| Layer | Technology |
|---|---|
| API | NestJS (Node.js) |
| Organizer Dashboard | Next.js (client-side rendered) |
| Public Storefront | Next.js (server-side rendered) |
| Database | PostgreSQL 16 |
| Job Queue | Redis 7 + BullMQ |
| ORM | Prisma |
| Container | Docker / Docker Compose |
| Orchestration | Kubernetes on GCP _(planned)_ |

## Repository Structure

```
eventify/
├── apps/
│   ├── api/          ← NestJS backend
│   ├── dashboard/    ← Next.js organizer control plane
│   └── storefront/   ← Next.js public event storefront
├── packages/
│   └── shared-types/ ← DTOs, enums, interfaces shared across apps
├── docker/
│   └── postgres/
│       └── init.sql  ← DB user setup (RLS-restricted app user)
├── docs/
│   └── adr/          ← Architecture Decision Records
├── CONTEXT.md        ← Domain glossary (ubiquitous language)
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9 (`npm install -g pnpm`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone & Install

```bash
git clone <repo-url> eventify
cd eventify
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env if needed — defaults work with the Docker Compose setup
```

### 3. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on `localhost:5432` (with `eventify_admin` and `eventify_app` users)
- **Redis 7** on `localhost:6379`

### 4. Run Migrations

```bash
pnpm --filter @eventify/api prisma:migrate
```

### 5. Start the API

```bash
pnpm dev:api
# API available at http://localhost:3000
# Health check: http://localhost:3000/health
# Queue dashboard (dev only): http://localhost:3000/admin/queues
```

## Architectural Constraints

- **Kebab-case naming** — all files and directories use `kebab-case`
- **Tenant isolation via RLS** — application code never adds `WHERE organization_id = ?`; PostgreSQL Row-Level Security handles isolation
- **Strict module decoupling** — NestJS modules communicate via injected services or BullMQ events, never by importing internal files from other modules
- **Dual database users** — `eventify_admin` (superuser, used by Prisma migrations, bypasses RLS), `eventify_app` (restricted user, used by API at runtime, subject to RLS)
- **Soft delete** — Organization and Event entities use `deleted_at` timestamp; rows are never physically deleted

## Database Users

| User | Role | Used by | RLS |
|---|---|---|---|
| `eventify_admin` | Superuser | Prisma migrations | Bypassed |
| `eventify_app` | Restricted | API at runtime | Enforced |

## Architecture Decision Records

| ADR | Decision |
|---|---|
| [0001](./docs/adr/0001-shared-schema-multi-tenancy-with-rls.md) | Shared-schema multi-tenancy with PostgreSQL RLS |
| [0002](./docs/adr/0002-self-managed-authentication.md) | Self-managed auth over delegated providers |
| [0003](./docs/adr/0003-prisma-with-raw-sql-for-rls.md) | Prisma ORM with raw SQL escape hatch for RLS policies |
