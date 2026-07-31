import { SetMetadata } from '@nestjs/common';
import { SubscriptionTier } from '@eventify/shared-types';

export const TIER_KEY = 'required_tier';
export const RequireTier = (tier: SubscriptionTier) => SetMetadata(TIER_KEY, tier);
