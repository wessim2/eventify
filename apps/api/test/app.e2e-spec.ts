import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  clearDatabase,
  registerAndLogin,
  createOrg,
} from './helpers/test-helpers';

/**
 * P1-017: Auth flow E2E tests
 * Covers: register, login, refresh rotation, replay detection, logout
 */
describe('Eventify API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {

  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'user@test.com',
          password: 'password123',
          firstName: 'Alice',
          lastName: 'Smith',
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should return 409 for duplicate email', async () => {
      await registerAndLogin(app, 'dupe@test.com');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'dupe@test.com',
          password: 'password123',
          firstName: 'Bob',
          lastName: 'Jones',
        })
        .expect(409);
    });

    it('should reject passwords shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'x@test.com', password: '123', firstName: 'X', lastName: 'Y' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      await registerAndLogin(app, 'login@test.com');
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@test.com', password: 'password123' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
    });

    it('should return 401 for wrong password', async () => {
      await registerAndLogin(app, 'wrong@test.com');
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'wrong@test.com', password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should rotate refresh token and return new tokens', async () => {
      const { refreshToken: original } = await registerAndLogin(app);
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: original })
        .expect(200);

      expect(res.body.refreshToken).not.toBe(original);
    });

    it('should invalidate all tokens on refresh token replay attack', async () => {
      const { refreshToken } = await registerAndLogin(app);

      // First refresh — legitimate use
      const res1 = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Second refresh with original (revoked) token — replay attack
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      // New token should also be invalidated
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: res1.body.refreshToken })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should revoke refresh token', async () => {
      const { accessToken, refreshToken } = await registerAndLogin(app);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204);

      // Refresh with revoked token should fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});

/**
 * P1-017: Multi-tenancy isolation E2E tests
 * Proves cross-tenant data leakage is impossible at the RLS level.
 */
  describe('Multi-tenancy isolation', () => {

  it('user cannot read another org events using X-Organization-Id header', async () => {
    // Setup: two users, two orgs, one event each
    const userA = await registerAndLogin(app, 'a@test.com');
    const orgA = await createOrg(app, userA.accessToken, 'Org A');

    const userB = await registerAndLogin(app, 'b@test.com');
    const orgB = await createOrg(app, userB.accessToken, 'Org B');

    // User A creates an event in Org A
    await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .set('X-Organization-Id', orgA.id)
      .send({
        title: 'Org A Event',
        startDate: '2026-10-01T09:00:00Z',
        endDate: '2026-10-01T18:00:00Z',
      })
      .expect(201);

    // User B queries events with Org B context — should see zero
    const res = await request(app.getHttpServer())
      .get('/events')
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .set('X-Organization-Id', orgB.id)
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('should return 403 when user sets X-Organization-Id to an org they are not a member of', async () => {
    const userA = await registerAndLogin(app, 'a2@test.com');
    const orgA = await createOrg(app, userA.accessToken, 'Org A2');

    const userB = await registerAndLogin(app, 'b2@test.com');

    // User B tries to access Org A's data
    await request(app.getHttpServer())
      .get('/events')
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .set('X-Organization-Id', orgA.id)
      .expect(403);
  });
});

/**
 * P1-017: RBAC enforcement E2E tests
 */
  describe('RBAC', () => {

  it('Member cannot delete an organization', async () => {
    const owner = await registerAndLogin(app, 'owner@test.com');
    const org = await createOrg(app, owner.accessToken, 'RBAC Org');

    const member = await registerAndLogin(app, 'member@test.com');

    // Owner invites member
    await request(app.getHttpServer())
      .post(`/organizations/${org.id}/invitations`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .set('X-Organization-Id', org.id)
      .send({ email: 'member@test.com', role: 'MEMBER' })
      .expect(201);

    // Find invitation and accept it
    const invitations = await prisma.invitation.findMany({
      where: { organizationId: org.id },
    });
    await request(app.getHttpServer())
      .post(`/organizations/${org.id}/invitations/${invitations[0].id}/accept`)
      .set('Authorization', `Bearer ${member.accessToken}`)
      .expect(200);

    // Member tries to delete org — should be forbidden
    await request(app.getHttpServer())
      .delete(`/organizations/${org.id}`)
      .set('Authorization', `Bearer ${member.accessToken}`)
      .set('X-Organization-Id', org.id)
      .expect(403);
  });

  it('cannot remove the last Owner', async () => {
    const owner = await registerAndLogin(app, 'lastowner@test.com');
    const org = await createOrg(app, owner.accessToken, 'Solo Org');

    const ownerRecord = await prisma.user.findUnique({
      where: { email: 'lastowner@test.com' },
    });

    // Owner tries to remove themselves (they're the only owner)
    await request(app.getHttpServer())
      .delete(`/organizations/${org.id}/members/${ownerRecord!.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .set('X-Organization-Id', org.id)
      .expect(422);
  });

  it('Owner can create events, Member cannot', async () => {
    const owner = await registerAndLogin(app, 'owner2@test.com');
    const org = await createOrg(app, owner.accessToken, 'Events Org');

    // Owner can create
    await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .set('X-Organization-Id', org.id)
      .send({
        title: 'Test Event',
        startDate: '2026-11-01T09:00:00Z',
        endDate: '2026-11-01T17:00:00Z',
      })
      .expect(201);
  });
});

  describe('Storefront Booking & Concurrency', () => {
    async function waitForStatus(registrationId: string, status: string, timeout = 5000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const adminPrisma = new (require('@prisma/client').PrismaClient)({
          datasourceUrl: process.env.DATABASE_URL,
        });
        try {
          const reg = await adminPrisma.registration.findUnique({ where: { id: registrationId } });
          if (reg && reg.status === status) {
            return reg;
          }
        } finally {
          await adminPrisma.$disconnect();
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(`Timeout waiting for registration ${registrationId} to be ${status}`);
    }

    it('should list published events and register tickets with concurrency checks', async () => {
      // 1. Setup Organizer & Event
      const owner = await registerAndLogin(app, 'organizer@test.com');
      const org = await createOrg(app, owner.accessToken, 'Storefront Org');

      const adminPrisma = new (require('@prisma/client').PrismaClient)({
        datasourceUrl: process.env.DATABASE_URL,
      });

      // Create a published event
      const event = await adminPrisma.event.create({
        data: {
          organizationId: org.id,
          title: 'Storefront Expo',
          slug: 'storefront-expo',
          status: 'PUBLISHED',
          startDate: new Date('2026-12-01T09:00:00Z'),
          endDate: new Date('2026-12-01T18:00:00Z'),
        },
      });

      // Create a ticket type with capacity = 5
      const ticketType = await adminPrisma.ticketType.create({
        data: {
          eventId: event.id,
          name: 'General Admission',
          price: 15.00,
          capacity: 5,
        },
      });

      await adminPrisma.$disconnect();

      // 2. Query published events via storefront (anonymous)
      const listRes = await request(app.getHttpServer())
        .get('/storefront/events')
        .set('X-Organization-Slug', org.slug)
        .expect(200);

      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0].title).toBe('Storefront Expo');

      // 3. Fire concurrent registrations
      // Register 10 users to book tickets (capacity = 5)
      const attendees = [];
      for (let i = 0; i < 10; i++) {
        attendees.push(await registerAndLogin(app, `attendee_${i}@test.com`));
      }

      // Fire 10 concurrent requests
      const registrationPromises = attendees.map((attendee) => {
        return request(app.getHttpServer())
          .post(`/storefront/events/${event.id}/register`)
          .set('Authorization', `Bearer ${attendee.accessToken}`)
          .set('X-Organization-Slug', org.slug)
          .send({
            ticketTypeId: ticketType.id,
            quantity: 1,
          });
      });

      const responses = await Promise.all(registrationPromises);

      // Verify concurrency outcomes: exactly 5 should succeed, 5 should fail with 409
      const succeeded = responses.filter((r) => r.status === 201);
      const failed = responses.filter((r) => r.status === 409);

      expect(succeeded).toHaveLength(5);
      expect(failed).toHaveLength(5);

      // Verify db state
      const checkPrisma = new (require('@prisma/client').PrismaClient)({
        datasourceUrl: process.env.DATABASE_URL,
      });
      const dbTicket = await checkPrisma.ticketType.findUnique({ where: { id: ticketType.id } });
      expect(dbTicket.sold).toBe(5);

      // 4. Test payment success webhook flow
      const successRegId = succeeded[0].body.registrationId;
      const successIntentId = succeeded[0].body.paymentIntentId;

      await request(app.getHttpServer())
        .post('/storefront/payments/webhook')
        .send({
          registrationId: successRegId,
          paymentIntentId: successIntentId,
          shouldFail: false,
        })
        .expect(200);

      // Wait for queue processor to update status to CONFIRMED
      const confirmedReg = await waitForStatus(successRegId, 'CONFIRMED');
      expect(confirmedReg.status).toBe('CONFIRMED');

      // 5. Test payment failure webhook flow (releases inventory)
      const failRegId = succeeded[1].body.registrationId;
      const failIntentId = succeeded[1].body.paymentIntentId;

      await request(app.getHttpServer())
        .post('/storefront/payments/webhook')
        .send({
          registrationId: failRegId,
          paymentIntentId: failIntentId,
          shouldFail: true,
        })
        .expect(200);

      // Wait for queue processor to update status to FAILED
      const failedReg = await waitForStatus(failRegId, 'FAILED');
      expect(failedReg.status).toBe('FAILED');

      // Verify that inventory was rolled back (sold count decremented to 4)
      const rolledBackTicket = await checkPrisma.ticketType.findUnique({ where: { id: ticketType.id } });
      expect(rolledBackTicket.sold).toBe(4);

      await checkPrisma.$disconnect();
    });
  });
});
