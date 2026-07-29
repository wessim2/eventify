import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Env } from '../config/env.schema';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser } from '../common/types/request.types';
import { QueueName, EmailJobType } from '@eventify/shared-types';

const BCRYPT_SALT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    // Enqueue verification email (fire-and-forget, non-blocking)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.emailQueue.add(
      EmailJobType.VERIFICATION_EMAIL,
      { userId: user.id, email: user.email, verificationToken },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    this.logger.log(`User registered: ${user.email}`);
    return this.issueTokens(user.id, user.email);
  }

  /**
   * Validates email/password credentials. Called by LocalStrategy.
   * Returns the user without sensitive fields, or null on failure.
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return { userId: user.id, email: user.email };
  }

  async login(user: AuthenticatedUser): Promise<AuthTokens> {
    return this.issueTokens(user.userId, user.email);
  }

  async refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Replay attack detection — token already revoked
    if (stored.revokedAt) {
      this.logger.warn(
        `Replay attack detected for user ${stored.userId} — revoking all tokens`,
      );
      await this.revokeAllTokensForUser(stored.userId);
      throw new UnauthorizedException(
        'Refresh token has already been used. All sessions have been invalidated.',
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Revoke the current token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.userId, stored.user.email);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async issueTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign({ sub: userId, email });

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const refreshExpirationDays = this.parseExpirationDays(
      this.configService.get('JWT_REFRESH_EXPIRATION', { infer: true }),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(
          Date.now() + refreshExpirationDays * 24 * 60 * 60 * 1000,
        ),
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private async revokeAllTokensForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** SHA-256 hash of a raw token — stored in DB, never the raw token. */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** Parses e.g. "7d" → 7. Supports d (days) only for refresh tokens. */
  private parseExpirationDays(exp: string): number {
    const match = exp.match(/^(\d+)d$/);
    return match ? parseInt(match[1], 10) : 7;
  }
}
