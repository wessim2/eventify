import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that runs the local (email/password) Passport strategy.
 * Used only on POST /auth/login.
 * Populates request.user with the validated user on success.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
