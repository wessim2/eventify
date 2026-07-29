# Prisma ORM with Raw SQL Escape Hatch for RLS Policies

We use Prisma as the primary ORM for schema definition, migrations, and type-safe data access. PostgreSQL Row-Level Security policies — which Prisma does not natively support — are defined via raw SQL executed through `prisma.$executeRawUnsafe` in migration scripts.

We considered TypeORM (decorator-heavy, weaker TypeScript support), MikroORM (smaller community), and Knex.js (no ORM, maximum control). Prisma was chosen for its schema-first approach (`schema.prisma` as living documentation), generated type-safe client with zero boilerplate, and production-grade migration tooling compatible with CI/CD pipelines. The raw SQL escape hatch for RLS is a deliberate, bounded deviation — it applies only to policy definitions and the `SET` command for session variables, not to general queries.
