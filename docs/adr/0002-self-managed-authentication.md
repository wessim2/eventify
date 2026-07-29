# Self-Managed Authentication over Delegated Providers

We implement authentication in-house using Passport.js (`@nestjs/passport`) with a local strategy for credentials and a JWT strategy for stateless request authentication, with refresh token rotation stored in PostgreSQL.

We considered delegating to Auth0 or Firebase Auth, which would eliminate password hashing, token management, and email verification logic. Self-managed was chosen because this project is a portfolio demonstration of engineering capability — owning the full authentication lifecycle (bcrypt hashing, JWT issuance, refresh token rotation, guards) is a stronger signal than configuring a third-party SDK. It also keeps the project fully self-contained: anyone cloning the repo can run it locally without provisioning external accounts.
