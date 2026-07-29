/**
 * Canonical BullMQ queue name constants.
 * Used by both queue producers (API modules) and consumers (worker processors)
 * to ensure naming consistency without magic strings.
 */
export enum QueueName {
  EMAIL = 'email',
  EVENT_LIFECYCLE = 'event-lifecycle',
  PAYMENT = 'payment',
}
