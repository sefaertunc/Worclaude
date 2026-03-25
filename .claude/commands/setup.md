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
- Do NOT use information from previous conversations, memory, or
  other projects. This setup is for THIS project only. Only use
  information the user provides during this interview. Ask every
  question fresh — do not pre-fill answers from memory.

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
