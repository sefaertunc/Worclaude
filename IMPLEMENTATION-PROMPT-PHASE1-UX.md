# Implementation Prompt: Phase 1 UX Improvements

## Context
Read `docs/spec/SPEC.md` for the full product specification.
Read `docs/spec/PROGRESS.md` for current state.

Phase 1 foundation is complete. This prompt covers UX improvements to the init flow and a new `/setup` slash command. These are fixes and enhancements, not new phases.

## Overview of Changes

### A. Bug Fixes (3 items)
### B. Init Flow UX Improvements (6 items)
### C. New `/setup` Slash Command (1 item)
### D. SPEC.md Update (reflect all changes)

---

## A. Bug Fixes

### A1. Double `|| true` in formatter hook
The formatter hook in settings.json outputs `"command": "npx prettier --write . || true || true"`. Find where the settings template merges the formatter command and remove the duplicate `|| true`.

### A2. Tech stack display in CLAUDE.md
CLAUDE.md shows just "Node" instead of "Node.js / TypeScript". Display the full selection label as the user saw it in the prompt, not the internal key.

### A3. Verify .mcp.json creation
Confirm .mcp.json is being created at the project root. It shows in the success output but may not actually be created. Fix if missing.

---

## B. Init Flow UX Improvements

### B1. Project Type — Add Descriptions + Hints

Add short inline descriptions to each project type option:

```
? What type of project is this? (space to toggle, enter to confirm)

  ◻ Full-stack web       — Frontend + backend in one repo
  ◻ Backend / API        — Server, REST/GraphQL, no frontend
  ◻ Frontend / UI        — Client-side app, no backend
  ◻ CLI tool             — Command-line application
  ◻ Data / ML / AI       — Data pipelines, ML models, LLM apps
  ◻ Library / Package    — Reusable module published to npm/PyPI
  ◻ DevOps / Infra       — Infrastructure, CI/CD, deployment
```

Add a hint below the options:
```
  ℹ Not sure? Pick what's closest. You can add or remove
    agents later with `claude-workflow upgrade`.
```

Add smart redundancy detection — if user selects "Full-stack web" AND "Backend / API" AND/OR "Frontend / UI", show:
```
  ⚠ "Full-stack web" already includes backend and frontend.
    You may not need to select those separately.
```
This is a warning only — don't block the selection. Let the user decide.

### B2. Confirmation Step Before Scaffolding

After all prompts are completed, but BEFORE any files are created, show a review summary:

```
  ─── Review Your Selections ───

  Project:    Sample Project — Just a sample project
  Type:       Full-stack web application
  Stack:      Python, Docker
  Agents:     5 universal + 6 recommended + 2 additional (13 total)

? Everything look right?
  ◉ Yes, install the workflow
  ○ No, let me start over
  ○ Let me adjust a specific step
```

If "start over" — restart the entire prompt flow from project name.
If "adjust a specific step" — show which steps can be redone:
```
? Which step do you want to adjust?
  ○ Project name and description
  ○ Project type
  ○ Tech stack
  ○ Agent selection
```

Then re-run just that step's prompts and return to the confirmation screen.

### B3. Multi-Select Language / Runtime

Change the primary language question from single-select to multi-select. Projects can use multiple languages (e.g., Python backend + Node frontend).

```
? Primary language(s) / runtime: (space to toggle, enter to confirm)
  ◻ Python
  ◻ Node.js / TypeScript
  ◻ Rust
  ◻ Go
  ◻ Other

  ℹ This determines which tool permissions and formatters
    are added. You can update later by editing
    .claude/settings.json or running `claude-workflow upgrade`.
```

When multiple languages are selected, merge all their permissions and add all their formatters to hooks (run each formatter sequentially).

### B4. Docker Question Rewording

Change the Docker question to emphasize "currently" and add guidance:

```
? Do you use Docker in this project currently? (y/N)
  ℹ If you add Docker later, run `claude-workflow upgrade`
    to add Docker permissions and tools.
```

### B5. Category-Based Agent Selection

Replace the current flat list of optional agents with a two-step category approach.

**Step 1: Select agent categories (compact 6-item list)**

```
? Which agent categories do you need? (space to toggle)
  ◼ Backend       — api-designer, database-analyst, auth-auditor
  ◻ Frontend      — ui-reviewer, style-enforcer
  ◻ DevOps        — ci-fixer, docker-helper, deploy-validator, dependency-manager
  ◼ Quality       — bug-fixer, security-reviewer, performance-auditor, refactorer
  ◻ Documentation — doc-writer, changelog-generator
  ◻ Data / AI     — data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer
```

Categories that match the selected project types should be pre-selected (◼).
List the agent names inline so users know what's in each category.

**Step 2: Fine-tune each selected category**

For each selected category, ask if the user wants to adjust the individual agents:

```
? Fine-tune Backend agents? (space to toggle, enter to accept defaults)
  ◼ api-designer       — Reviews API design for RESTful conventions
  ◼ database-analyst    — Reviews database schemas and queries
  ◼ auth-auditor        — Audits authentication and authorization
```

All agents in recommended categories start selected. User can deselect specific ones.

If the user just presses enter without changing anything, accept all defaults. This makes the fast path very fast.

### B6. Pre-Filled Templates by Project Type

The SPEC.md and project-specific skill templates should not be generic stubs. Generate tailored starter content based on the project type and tech stack.

Create multiple SPEC.md template variants in `templates/`:
- `templates/spec-md-fullstack.md`
- `templates/spec-md-backend.md`
- `templates/spec-md-frontend.md`
- `templates/spec-md-cli.md`
- `templates/spec-md-data.md`
- `templates/spec-md-library.md`
- `templates/spec-md-devops.md`

Each variant includes relevant sections pre-structured with guiding placeholders. Example for Backend / API:

```markdown
# SPEC.md — {project_name}

## Product Overview
[Describe what this API does and who consumes it]

## Tech Stack
- **Language:** {tech_stack}
- **Framework:** [e.g., FastAPI, Express, Gin]
- **Database:** [e.g., PostgreSQL, MongoDB, SQLite]
- **Auth:** [e.g., JWT, OAuth2, API keys]
- **Hosting:** [e.g., Railway, AWS, GCP]

## API Endpoints
| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| GET    | /api/v1/... | ... | Yes/No |
| POST   | /api/v1/... | ... | Yes/No |

## Data Model
### [Entity Name]
| Field | Type | Constraints |
|-------|------|-------------|
| id    | UUID | Primary key |
| ...   | ...  | ...         |

## Authentication & Authorization
[Describe auth approach — JWT, OAuth2, API keys, etc.]
[Define roles and permissions if applicable]

## Error Handling
[Standard error response format]

## Implementation Phases
### Phase 1: Foundation
- [ ] Project setup and dependencies
- [ ] Database schema and migrations
- [ ] Basic CRUD endpoints
- [ ] Authentication

### Phase 2: Core Features
- [ ] [Main feature 1]
- [ ] [Main feature 2]

### Phase 3: Polish
- [ ] Error handling standardization
- [ ] Input validation
- [ ] Rate limiting
- [ ] API documentation (OpenAPI/Swagger)
```

Similarly, create tailored versions of the template skills:
- `backend-conventions.md` should have different starter content for Python/FastAPI vs Node/Express vs Go/Gin
- `frontend-design-system.md` should have different content for React vs Vue vs vanilla
- `project-patterns.md` should have architecture patterns relevant to the project type

When multiple project types are selected, merge the relevant sections from each template.

---

## C. New `/setup` Slash Command

### Purpose
After init scaffolds the structure, `/setup` fills in the content through a conversational interview. Claude asks questions, the user answers, and Claude writes the project-specific files.

### Create the command file: `templates/commands/setup.md`

```markdown
You are conducting a project setup interview. Your goal is to gather
enough information to fill in all project-specific files with real,
useful content.

IMPORTANT RULES:
- Before EVERY question, remind the user: "You can type 'skip' to
  skip this section or 'back' to return to the previous one."
- Show a persistent section indicator: "Section X of 7: [Name]"
- If the user seems uncertain, reassure them: "No pressure — you
  can always update these files later. Skip anything you're not
  sure about."
- After each section, briefly summarize what you learned before
  moving on.
- Be conversational, not robotic. Adapt follow-up questions based
  on answers.

## Interview Flow

### Section 1 of 7: Project Story
Ask: "Do you have an existing project description, PRD, requirements
document, or any file that describes your project? If so, share the
file path and I'll read it first."

If yes: Read the file. Extract purpose, features, users, constraints.
Use this context for all subsequent questions — skip questions already
answered by the document.

If no, ask:
- What does this project do in one paragraph?
- Who is it for? (end users, developers, internal team, etc.)
- What problem does it solve?
- Is there a similar product you're modeling this after?

### Section 2 of 7: Architecture & Structure
- What's the overall architecture? (monolith, microservices, monorepo, serverless)
- What are the main directories or modules and their purposes?
- What database(s) do you use? What are the main entities/tables?
- Does it integrate with any external services or APIs?
- How is it deployed? (Vercel, Railway, AWS, Docker, etc.)

### Section 3 of 7: Tech Stack Details
- Specific frameworks and versions? (e.g., FastAPI 0.100+, Next.js 14)
- Package manager? (npm, yarn, pnpm, bun, pip, poetry)
- ORM or database client? (Prisma, SQLAlchemy, Drizzle, etc.)
- Testing framework? (pytest, vitest, jest, etc.)
- Linting/formatting tools already configured?

### Section 4 of 7: Core Features
- What are the main features or modules?
- Which are already built vs planned?
- What's the priority order?
- Any complex business logic Claude should understand?
- Any tricky edge cases or gotchas you've discovered?

### Section 5 of 7: Development Workflow
- How do you start the project locally? (exact commands)
- How do you run tests? (exact commands)
- How do you build for production?
- Any environment variables needed? (names only, not values)
- CI/CD pipeline? (GitHub Actions, GitLab CI, etc.)
- Any setup steps for new developers?

### Section 6 of 7: Coding Conventions
- Any specific patterns? (repository pattern, service layer, clean architecture, etc.)
- Error handling approach?
- Logging approach?
- API response format conventions?
- Naming conventions for files, functions, variables?
- Any "never do this" rules specific to this project?
- Any "always do this" rules?

### Section 7 of 7: Verification Strategy
- How should Claude verify its changes work?
- Are there specific test commands beyond the standard ones?
- Can Claude run the app and test it manually? How?
- Any browser testing needed? How to set up?
- Is there a staging or preview environment?
- Any CI checks that must pass before merging?

## After Interview

Summarize everything learned in a brief overview. Then write/update
these files with real, project-specific content:

1. **CLAUDE.md** — Update Tech Stack section with exact tools and
   versions. Update Commands section with real project commands.
   Add any project-specific critical rules or gotchas.

2. **docs/spec/SPEC.md** — Write a comprehensive specification
   from the interview answers. Include all features, data models,
   architecture decisions, and implementation phases.

3. **.claude/skills/backend-conventions.md** — Fill with real
   backend patterns, framework-specific conventions, database
   patterns specific to this project.

4. **.claude/skills/frontend-design-system.md** — Fill with real
   design system, component patterns, styling approach if
   applicable.

5. **.claude/skills/project-patterns.md** — Fill with real
   architectural patterns, directory structure explanation,
   module interaction patterns.

6. **docs/spec/PROGRESS.md** — Update with actual phases and
   features from the interview, marking completed items.

Show the user what files were updated and offer to review each one.
```

### Update the universal commands count
This brings the total from 9 to 10 universal slash commands. Update all references (SPEC.md, display output, etc.).

---

## D. Update SPEC.md

After implementing all changes, update `docs/spec/SPEC.md` to reflect:
- The new `/setup` command (10 universal commands, not 9)
- Confirmation step in init flow
- Multi-select language
- Category-based agent selection
- Pre-filled templates by project type
- Description text on project type options

---

## Verification

After implementation, test the full flow:

1. **Fresh init test:**
   ```bash
   rm -rf /tmp/test-workflow && mkdir /tmp/test-workflow && cd /tmp/test-workflow && git init
   node /home/sefa/SEFA/GIT/Claude-Workflow/src/index.js init
   ```
   - Verify project type descriptions are visible
   - Select "Full-stack web" + "Backend / API" — verify redundancy warning
   - Select multiple languages — verify all permissions merge correctly
   - Verify category-based agent selection works
   - Verify confirmation step appears with correct summary
   - Test "start over" and "adjust specific step" flows
   - Verify SPEC.md has project-type-specific content
   - Verify settings.json has no double `|| true`
   - Verify CLAUDE.md shows full tech stack labels
   - Verify .mcp.json exists at project root
   - Verify `/setup` command file exists in .claude/commands/

2. **Run existing tests:**
   ```bash
   npm test
   ```
   Fix any broken tests, add new tests for:
   - Confirmation step logic
   - Multi-select language merging
   - Category-based agent selection
   - Redundancy detection
   - Template variant selection by project type

## Constraints
- Use ES modules (import/export)
- Cross-platform: path.join(), os.platform()
- All user-facing output through src/utils/display.js
- Template variables use {variable_name} syntax
- Inquirer.js for all interactive prompts
