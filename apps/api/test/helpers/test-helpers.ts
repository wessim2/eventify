import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';

/**
 * E2E test helpers — shared across all test suites.
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma };
}

import { PrismaClient } from '@prisma/client';

/** Clears all test data — run before each test suite */
export async function clearDatabase(prisma: PrismaService): Promise<void> {
  const adminPrisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
  try {
    await adminPrisma.$executeRawUnsafe(
      'TRUNCATE TABLE "registrations", "ticket_types", "refresh_tokens", "invitations", "organization_memberships", "events", "organizations", "users" CASCADE',
    );
  } finally {
    await adminPrisma.$disconnect();
  }
}

/** Registers and logs in a user, returns tokens */
export async function registerAndLogin(
  app: INestApplication,
  email = 'test@example.com',
  password = 'password123',
  firstName = 'Test',
  lastName = 'User',
) {
  const registerRes = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password, firstName, lastName })
    .expect(201);

  return registerRes.body as { accessToken: string; refreshToken: string };
}

/** Creates an organization and returns it with the auth token */
export async function createOrg(
  app: INestApplication,
  accessToken: string,
  name = 'Test Org',
) {
  const res = await request(app.getHttpServer())
    .post('/organizations')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name })
    .expect(201);
  return res.body as { id: string; name: string; slug: string };
}
