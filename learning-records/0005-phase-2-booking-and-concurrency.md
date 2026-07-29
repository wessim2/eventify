# Implementation of Public Storefront, Booking and Concurrency Engine

We successfully designed and implemented Phase 2 of the SaaS backend, covering ticket registrations, concurrent inventory checks, background payment worker processing, and public storefront APIs.

## Key Learnings
- **Pessimistic Locking**: Configured raw SQL `SELECT ... FOR UPDATE` inside interactive transactions to lock ticket type rows, ensuring capacity calculations are completely isolated under high concurrency.
- **Background Webhook Decoupling**: Designed a dual-controller model (`StorefrontController` for user routes, `PaymentWebhookController` for system webhooks) to avoid coupling client headers to automated background callbacks.
- **Admin Database Connection**: Introduced `AdminPrismaService` connected as `eventify_admin` to bypass RLS for workers (like payment processing and email sending) and slug-to-ID lookup.
- **E2E Concurrency Test**: Verified inventory limits and payment failures via high-concurrency Node request promises.
