# SPEC.md — {project_name}

## Product Overview
{description}

## Tech Stack
| Layer       | Technology                        |
|-------------|-----------------------------------|
| Language    | {tech_stack_table}                |{docker_row}
| Framework   | [e.g. Express, FastAPI, Gin]      |
| Database    | [e.g. PostgreSQL, MongoDB, Redis] |
| Auth        | [e.g. JWT, API keys, OAuth2]      |
| Hosting     | [e.g. AWS, Railway, Fly.io]       |
| CI/CD       | [e.g. GitHub Actions]             |

## API Endpoints
| Method | Path                  | Purpose                          | Auth Required |
|--------|-----------------------|----------------------------------|---------------|
| POST   | `/api/auth/login`     | [Authenticate and return token]  | No            |
| POST   | `/api/auth/register`  | [Create new user account]        | No            |
| GET    | `/api/[resource]`     | [List with pagination/filtering] | [Yes/No]      |
| GET    | `/api/[resource]/:id` | [Get single resource by ID]      | [Yes/No]      |
| POST   | `/api/[resource]`     | [Create new resource]            | [Yes/No]      |
| PUT    | `/api/[resource]/:id` | [Full update of resource]        | [Yes/No]      |
| PATCH  | `/api/[resource]/:id` | [Partial update of resource]     | [Yes/No]      |
| DELETE | `/api/[resource]/:id` | [Soft/hard delete resource]      | [Yes/No]      |

## Data Model
### [PrimaryEntity]
| Field       | Type      | Constraints                      |
|-------------|-----------|----------------------------------|
| id          | UUID      | Primary key, auto-generated      |
| [field]     | [type]    | [required, unique, indexed, etc] |
| created_at  | Timestamp | Auto-set on creation             |
| updated_at  | Timestamp | Auto-set on update               |

### [SecondaryEntity]
| Field       | Type      | Constraints                      |
|-------------|-----------|----------------------------------|
| id          | UUID      | Primary key, auto-generated      |
| [field]     | [type]    | [constraints]                    |
| [foreign]   | UUID      | FK -> [PrimaryEntity].id         |

## Authentication & Authorization
- **Strategy:** [JWT bearer tokens / API key header / OAuth2]
- **Roles:** [e.g. admin, user, service — describe permissions per role]
- **Token lifetime:** [e.g. 15m access, 7d refresh]
- **Rate limiting:** [e.g. 100 req/min per API key]

## Error Handling
Response format: `{ "error": { "code": "MACHINE_CODE", "message": "...", "details": "..." } }`

| HTTP Status | When Used                                |
|-------------|------------------------------------------|
| 400         | Validation failure, malformed request    |
| 401         | Missing or invalid authentication        |
| 403         | Authenticated but not authorized         |
| 404         | Resource not found                       |
| 409         | Conflict (duplicate, stale update)       |
| 422         | Business logic violation                 |
| 429         | Rate limit exceeded                      |
| 500         | Unhandled server error                   |

## Implementation Phases

### Phase 1 — Foundation
- [ ] Project scaffolding and dependency setup
- [ ] Database connection and schema migrations
- [ ] Basic CRUD for [primary resource]
- [ ] Authentication (signup, login, token refresh)
- [ ] Request validation middleware

### Phase 2 — Core Features
- [ ] Remaining resource endpoints
- [ ] Business logic and domain rules
- [ ] Pagination, filtering, and sorting
- [ ] Authorization and role checks
- [ ] Background jobs [if applicable]

### Phase 3 — Polish
- [ ] Rate limiting, input sanitization, security hardening
- [ ] OpenAPI / Swagger documentation
- [ ] Logging, health-check endpoint, comprehensive error handling
- [ ] Integration and load tests
- [ ] Deployment pipeline and monitoring
