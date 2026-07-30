import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AdminPrismaService } from '../prisma/admin-prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { Role, QueueName, EmailJobType } from '@eventify/shared-types';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminPrisma: AdminPrismaService,
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const slug = await this.generateSlug(dto.name);
    const orgId = randomUUID();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma.$transaction(async (tx: any) => {
      // Set the session variable to the pre-generated ID so RETURNING clause passes RLS
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${orgId}'`,
      );

      const org = await tx.organization.create({
        data: { id: orgId, name: dto.name, slug },
      });

      // Auto-assign the creator as Owner
      await tx.organizationMembership.create({
        data: { userId, organizationId: org.id, role: Role.OWNER },
      });

      this.logger.log(`Organization created: ${org.slug} by user ${userId}`);
      return org;
    });
  }

  /** Lists all organizations the user is a member of (not tenant-scoped). */
  async listForUser(userId: string) {
    const memberships = await this.adminPrisma.organizationMembership.findMany({
      where: { userId },
      include: { organization: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return memberships
      .filter((m: any) => m.organization && !m.organization.deletedAt)
      .map((m: any) => ({ ...m.organization, role: m.role }));
  }

  async findById(id: string) {
    const org = await this.adminPrisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findById(id);
    const data: { name?: string; slug?: string } = {};
    if (dto.name) {
      data.name = dto.name;
      data.slug = await this.generateSlug(dto.name, id);
    }
    return this.prisma.organization.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    await this.findById(id);
    await this.prisma.organization.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Member management
  // ---------------------------------------------------------------------------

  async listMembers(organizationId: string) {
    return this.prisma.organizationMembership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async inviteMember(
    organizationId: string,
    invitedByUserId: string,
    dto: InviteMemberDto,
  ) {
    const org = await this.findById(organizationId);
    const inviter = await this.prisma.user.findUnique({
      where: { id: invitedByUserId },
    });

    // Check if already a member
    const existing = await this.prisma.organizationMembership.findFirst({
      where: { organizationId, user: { email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.upsert({
      where: { organizationId_email: { organizationId, email: dto.email } },
      update: { role: dto.role ?? Role.MEMBER, expiresAt, acceptedAt: null },
      create: {
        organizationId,
        invitedByUserId,
        email: dto.email,
        role: dto.role ?? Role.MEMBER,
        expiresAt,
      },
    });

    // Enqueue invitation email
    await this.emailQueue.add(
      EmailJobType.ORG_INVITATION,
      {
        inviterName: `${inviter?.firstName} ${inviter?.lastName}`,
        organizationName: org.name,
        inviteeEmail: dto.email,
        invitationId: invitation.id,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    return invitation;
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.acceptedAt) {
      throw new NotFoundException('Invitation not found or already accepted');
    }
    if (invitation.expiresAt < new Date()) {
      throw new UnprocessableEntityException('Invitation has expired');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma.$transaction(async (tx: any) => {
      await tx.organizationMembership.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });
      return tx.invitation.update({
        where: { id: invitationId },
        data: { acceptedAt: new Date() },
      });
    });
  }

  async removeMember(
    organizationId: string,
    targetUserId: string,
    actorUserId: string,
    actorRole: Role,
  ) {
    const targetMembership = await this.prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: { userId: targetUserId, organizationId },
      },
    });
    if (!targetMembership) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Cannot remove another Owner unless you're the Owner removing yourself
    if (targetMembership.role === Role.OWNER && actorRole !== Role.OWNER) {
      throw new ForbiddenException('Only Owners can remove other Owners');
    }

    // Prevent removing the last Owner
    if (targetMembership.role === Role.OWNER) {
      await this.ensureNotLastOwner(organizationId, targetUserId);
    }

    await this.prisma.organizationMembership.delete({
      where: {
        userId_organizationId: { userId: targetUserId, organizationId },
      },
    });
  }

  async updateMemberRole(
    organizationId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: { userId: targetUserId, organizationId },
      },
    });
    if (!membership) throw new NotFoundException('Member not found');

    // Prevent demoting the last Owner
    if (membership.role === Role.OWNER && dto.role !== Role.OWNER) {
      await this.ensureNotLastOwner(organizationId, targetUserId);
    }

    return this.prisma.organizationMembership.update({
      where: { userId_organizationId: { userId: targetUserId, organizationId } },
      data: { role: dto.role },
    });
  }

  // ---------------------------------------------------------------------------
  // Stripe Connect & Billing Integration
  // ---------------------------------------------------------------------------

  async createStripeConnectAccount(organizationId: string, userEmail: string) {
    const org = await this.findById(organizationId);
    
    // Fallback/mock URL handling if real Stripe API keys are not configured
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    
    let stripeAccountId = org.stripeAccountId;
    let url = `${process.env.DASHBOARD_URL || 'http://localhost:3001'}/dashboard?stripe=connected_mock`;

    if (stripeSecret && stripeSecret.startsWith('sk_')) {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(stripeSecret);
        
        if (!stripeAccountId) {
          const account = await stripe.accounts.create({
            type: 'express',
            email: userEmail,
            business_profile: { name: org.name },
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
          });
          stripeAccountId = account.id;
          await this.prisma.organization.update({
            where: { id: organizationId },
            data: { stripeAccountId },
          });
        }

        const accountLink = await stripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${process.env.DASHBOARD_URL || 'http://localhost:3001'}/dashboard?stripe=refresh`,
          return_url: `${process.env.DASHBOARD_URL || 'http://localhost:3001'}/dashboard?stripe=success`,
          type: 'account_onboarding',
        });
        url = accountLink.url;
      } catch (err: any) {
        this.logger.error(`Stripe connect creation error: ${err.message}`);
      }
    } else {
      // Mock onboarding flow for dev/local testing without active Stripe API key
      if (!stripeAccountId) {
        stripeAccountId = `acct_mock_${randomUUID().substring(0, 8)}`;
        await this.prisma.organization.update({
          where: { id: organizationId },
          data: { stripeAccountId },
        });
      }
    }

    return { url, stripeAccountId };
  }

  async getStripeStatus(organizationId: string) {
    const org = await this.findById(organizationId);
    return {
      organizationId: org.id,
      stripeAccountId: org.stripeAccountId,
      isConnected: !!org.stripeAccountId,
      subscriptionTier: org.subscriptionTier,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async ensureNotLastOwner(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const ownerCount = await this.prisma.organizationMembership.count({
      where: { organizationId, role: Role.OWNER },
    });
    if (ownerCount <= 1) {
      throw new UnprocessableEntityException(
        'Cannot remove or demote the last Owner. Assign another Owner first.',
      );
    }
  }

  private async generateSlug(name: string, excludeId?: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    let slug = base;
    let attempt = 0;

    while (true) {
      const existing = await this.prisma.organization.findUnique({
        where: { slug },
      });
      if (!existing || existing.id === excludeId) break;
      attempt++;
      slug = `${base}-${attempt}`;
    }

    return slug;
  }
}
