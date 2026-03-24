# SPEC.md — {project_name}

## Product Overview
{description}

## Tech Stack
| Layer            | Technology                        |
|------------------|-----------------------------------|
| Language         | {tech_stack_table}                |{docker_row}
| State Management | [e.g. Zustand, Redux, Pinia]     |
| Styling          | [e.g. Tailwind, CSS Modules]     |
| Build Tool       | [e.g. Vite, Webpack, Turbopack]  |
| Testing          | [e.g. Vitest, Playwright]        |
| Deployment       | [e.g. Vercel, Netlify, S3+CF]    |

## Pages / Routes
| Path              | Component        | Purpose                          |
|-------------------|------------------|----------------------------------|
| `/`               | HomePage         | [Landing or main entry point]    |
| `/login`          | LoginPage        | [User authentication]            |
| `/dashboard`      | DashboardPage    | [Primary authenticated view]     |
| `/[resource]`     | [Resource]List   | [Browse/search items]            |
| `/[resource]/:id` | [Resource]Detail | [View single item]               |
| `/settings`       | SettingsPage     | [User preferences]               |
| [add routes...]   | [Component]      | [Purpose]                        |

## Component Architecture
```
App -> Layout (Navbar, Sidebar, Footer)
    -> Pages -> [PageName] -> [FeatureSection] -> [Subcomponent]
    -> Shared (Button, Input, Modal, Card, ...)
```
[Describe organization strategy: feature-based folders, atomic design, or flat]

## State Management
- **Global state:** [What lives in the global store — auth, theme, notifications]
- **Server state:** [How API data is cached — React Query, SWR, or manual]
- **Local state:** [Component-level state approach]
- **URL state:** [What is stored in query params — filters, pagination, tabs]

## Design System
| Token         | Value                              |
|---------------|------------------------------------|
| Primary color | [e.g. #3B82F6]                    |
| Font family   | [e.g. Inter, system-ui]           |
| Base spacing  | [e.g. 4px grid]                   |
| Border radius | [e.g. 8px default]                |
| Breakpoints   | [sm:640, md:768, lg:1024, xl:1280]|

- **Dark mode:** [Yes/No — implementation approach]
- **Accessibility:** [WCAG level target, e.g. AA]
- **Animations:** [Library or CSS transitions, motion-reduce support]

## API Integration
- **Base URL:** [e.g. `/api` or `https://api.example.com`]
- **Auth header:** [e.g. `Authorization: Bearer <token>`]
- **Error display:** [Toast notifications / inline errors / error pages]
- **Optimistic updates:** [Which actions, if any]
- **Offline support:** [Yes/No — strategy if yes]

## Implementation Phases

### Phase 1 — Foundation
- [ ] Project scaffolding with build tool
- [ ] Routing and layout shell
- [ ] Design tokens and global styles
- [ ] Shared UI components (Button, Input, Card, Modal)

### Phase 2 — Core Pages
- [ ] Authentication flow (login, signup, password reset)
- [ ] [Primary feature] page with data fetching
- [ ] [Secondary feature] page
- [ ] Navigation and breadcrumbs

### Phase 3 — Interactivity & Polish
- [ ] Forms with validation
- [ ] Search, filtering, and pagination
- [ ] Real-time updates and file uploads [if applicable]
- [ ] Responsive design, loading skeletons, error boundaries
- [ ] Accessibility audit and performance optimization
- [ ] E2E tests for critical user flows
