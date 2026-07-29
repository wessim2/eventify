/**
 * Organization membership role within a tenant.
 * Scoped to a single Organization — the same User can hold different
 * roles in different Organizations.
 */
export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}
