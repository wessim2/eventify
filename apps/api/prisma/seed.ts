import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding development database...');

  // Create a seed user
  const passwordHash = await bcrypt.hash('password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@eventify.dev' },
    update: {},
    create: {
      email: 'admin@eventify.dev',
      passwordHash,
      firstName: 'Eventify',
      lastName: 'Admin',
      isEmailVerified: true,
    },
  });

  // Create a seed organization
  const org = await prisma.organization.upsert({
    where: { slug: 'gdg-demo' },
    update: {},
    create: {
      name: 'GDG Demo',
      slug: 'gdg-demo',
    },
  });

  // Assign user as Owner
  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'OWNER',
    },
  });

  // Create a draft event
  await prisma.event.upsert({
    where: {
      organizationId_slug: {
        organizationId: org.id,
        slug: 'annual-dev-summit-2026',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      title: 'Annual Dev Summit 2026',
      slug: 'annual-dev-summit-2026',
      description: 'Our flagship annual technology summit.',
      location: 'Lagos, Nigeria',
      startDate: new Date('2026-10-15T09:00:00Z'),
      endDate: new Date('2026-10-15T18:00:00Z'),
      status: 'DRAFT',
    },
  });

  console.log('✅ Seed complete');
  console.log(`   User: admin@eventify.dev / password123`);
  console.log(`   Org:  GDG Demo (slug: gdg-demo)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
