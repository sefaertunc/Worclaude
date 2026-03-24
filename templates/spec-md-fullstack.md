# SPEC.md — {project_name}

## Product Overview
{description}

## Tech Stack
| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | {tech_stack_filled_during_init}   |
| Backend     | [Framework, e.g. Express, Django] |
| Database    | [e.g. PostgreSQL, MongoDB]        |
| Auth        | [e.g. JWT, OAuth2, session-based] |
| Hosting     | [e.g. Vercel, AWS, Railway]       |
| CI/CD       | [e.g. GitHub Actions]             |

## Pages / Routes
| Path            | Page/Component   | Purpose                          | Auth Required |
|-----------------|------------------|----------------------------------|---------------|
| `/`             | Home             | [Landing page / dashboard]       | No            |
| `/login`        | Login            | [User authentication]            | No            |
| `/dashboard`    | Dashboard        | [Main authenticated view]        | Yes           |
| [add routes...] | [ComponentName]  | [What the user accomplishes]     | [Yes/No]      |

## API Endpoints
| Method | Path               | Purpose                          | Auth Required |
|--------|--------------------|----------------------------------|---------------|
| POST   | `/api/auth/login`  | [Authenticate user]              | No            |
| GET    | `/api/users/me`    | [Get current user profile]       | Yes           |
| GET    | `/api/[resource]`  | [List resources]                 | [Yes/No]      |
| POST   | `/api/[resource]`  | [Create resource]                | [Yes/No]      |
| PUT    | `/api/[resource]/:id` | [Update resource]             | [Yes/No]      |
| DELETE | `/api/[resource]/:id` | [Delete resource]             | [Yes/No]      |

## Data Model
### [PrimaryEntity]
| Field       | Type      | Constraints                      |
|-------------|-----------|----------------------------------|
| id          | UUID      | Primary key, auto-generated      |
| [field]     | [type]    | [required, unique, default, etc] |
| created_at  | Timestamp | Auto-set on creation             |
| updated_at  | Timestamp | Auto-set on update               |

### [SecondaryEntity]
| Field       | Type      | Constraints                      |
|-------------|-----------|----------------------------------|
| id          | UUID      | Primary key, auto-generated      |
| [field]     | [type]    | [constraints]                    |
| [foreign]   | UUID      | FK -> [PrimaryEntity].id         |

## Authentication & Authorization
- **Method:** [JWT tokens / session cookies / OAuth2 provider]
- **Roles:** [e.g. admin, user, guest — describe what each can do]
- **Token storage:** [httpOnly cookie / localStorage — justify choice]
- **Session duration:** [e.g. 24h access token, 7d refresh token]

## Implementation Phases

### Phase 1 — Foundation
- [ ] Project scaffolding and dev environment
- [ ] Database schema and migrations
- [ ] Basic authentication flow (signup, login, logout)
- [ ] CI/CD pipeline

### Phase 2 — Frontend Shell
- [ ] Layout components (navbar, sidebar, footer)
- [ ] Routing and navigation
- [ ] Auth pages (login, signup, forgot password)
- [ ] Design system / component library setup

### Phase 3 — Backend Core
- [ ] CRUD endpoints for [primary resource]
- [ ] Input validation and error handling
- [ ] Authorization middleware
- [ ] [Additional domain logic]

### Phase 4 — Integration & Polish
- [ ] Connect frontend to backend APIs
- [ ] Real-time features, file uploads, third-party integrations [if applicable]
- [ ] Responsive design, loading states, error boundaries
- [ ] Performance optimization (caching, lazy loading)
- [ ] End-to-end tests, deployment, and monitoring setup
