---
description: "Stack-specific backend patterns, API design, database access, error handling conventions"
---

# Backend Conventions

> Fill in each section with your project's specific patterns. Delete sections that
> don't apply. Add sections for patterns unique to your stack.

## API Patterns

<!-- How are endpoints structured? REST, GraphQL, RPC?
     What's the URL naming convention?
     How are request/response bodies structured?
     What authentication is required per endpoint?
     How is pagination handled?
     How are API versions managed? -->

## Database Access

<!-- Which ORM/query builder/driver is used?
     Where do migrations live? How are they run?
     What's the naming convention for tables and columns?
     How are transactions handled?
     Are there read replicas or connection pooling concerns?
     What's the seeding strategy for development? -->

## Error Handling

<!-- What error types/classes exist?
     How are errors propagated to the API response?
     What HTTP status codes map to which error types?
     How are errors logged?
     What information is safe to expose to clients vs internal-only? -->

## Authentication

<!-- What auth mechanism is used (JWT, sessions, API keys)?
     Where is auth middleware applied?
     How are roles/permissions structured?
     How are tokens refreshed?
     What's the password hashing strategy? -->

## Logging

<!-- What logging library is used?
     What log levels mean what?
     What structured fields are required on every log entry?
     Where do logs go (stdout, file, service)?
     What should NEVER be logged (PII, secrets)? -->

## Configuration Management

<!-- How is config loaded (env vars, config files, secrets manager)?
     What's the hierarchy (defaults < config file < env vars)?
     How are secrets managed in dev vs production?
     What validation runs on config at startup? -->
