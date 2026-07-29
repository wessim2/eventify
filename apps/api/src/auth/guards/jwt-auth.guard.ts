import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that validates the JWT Bearer token on protected routes.
 * Populates request.user with { userId, email } on success.
 * Returns 401 Unauthorized if the token is missing, invalid, or expired.
 *
 * Usage: @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
