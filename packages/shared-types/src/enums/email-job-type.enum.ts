/**
 * Job type discriminators for the email queue.
 * The processor uses these to route jobs to the correct handler.
 */
export enum EmailJobType {
  VERIFICATION_EMAIL = 'VERIFICATION_EMAIL',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ORG_INVITATION = 'ORG_INVITATION',
  TICKET_CONFIRMATION = 'TICKET_CONFIRMATION',
}
