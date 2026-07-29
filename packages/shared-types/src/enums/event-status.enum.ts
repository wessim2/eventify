/**
 * Lifecycle status of an Event.
 * Valid transitions:
 *   DRAFT → PUBLISHED
 *   DRAFT → CANCELLED
 *   PUBLISHED → COMPLETED
 *   PUBLISHED → CANCELLED
 * All other transitions are invalid.
 */
export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
