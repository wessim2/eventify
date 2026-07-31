import { z } from 'zod';

/**
 * Zod schema for environment variable validation.
 * The application fails to start if any required variable is missing or invalid.
 */
export const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  // Database — superuser connection (used by Prisma migrations, bypasses RLS)
  DATABASE_URL: z.string().url(),
  // Database — app-level connection (used at runtime, subject to RLS)
  DATABASE_APP_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // Queue
  EVENT_LIFECYCLE_INTERVAL_MS: z.coerce.number().default(900000),

  // Stripe & Billing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
