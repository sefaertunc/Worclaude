/**
 * Agent routing metadata for every agent in the registry.
 * Used by the agent-routing generator to produce the routing skill file.
 * Separate from agents.js because this data is only consumed by the generator,
 * not by CLI prompts or display logic.
 */
export const AGENT_REGISTRY = {
  // --- Universal agents ---

  'plan-reviewer': {
    category: 'universal',
    model: 'Opus',
    isolation: 'none',
    pipelineStage: 'Stage 2: Review',
    triggerType: 'manual',
    triggerCommand: '/review-plan',
    whenToUse: 'Before executing any implementation prompt. Always.',
    whatItDoes:
      'Reviews implementation plans as a senior staff engineer. Challenges assumptions, finds ambiguity, checks verification strategy, identifies missing edge cases.',
    expectBack: 'Refined plan with concerns addressed, or list of blocking questions.',
    situationLabel: 'Got an implementation prompt',
  },
  'test-writer': {
    category: 'universal',
    model: 'Sonnet',
    isolation: 'worktree',
    pipelineStage: 'Stage 5: Verify',
    triggerType: 'automatic',
    triggerCommand: null,
    whenToUse: 'After completing implementation of any feature or module.',
    whatItDoes:
      'Writes unit tests, integration tests, edge case tests. Covers happy path, error cases, boundary conditions.',
    expectBack: 'Test files committed to worktree branch. Merge when reviewed.',
    situationLabel: 'Finished implementing a feature',
  },
  'code-simplifier': {
    category: 'universal',
    model: 'Sonnet',
    isolation: 'worktree',
    pipelineStage: 'Stage 4: Quality',
    triggerType: 'automatic',
    triggerCommand: '/simplify',
    whenToUse:
      'After a feature is implemented and tests pass. Also when you notice growing complexity or duplication.',
    whatItDoes:
      'Reviews code for duplication, unnecessary abstraction, missed reuse opportunities. Simplifies without changing behavior.',
    expectBack: 'Cleanup commits on worktree branch. Diff review before merge.',
    situationLabel: 'Notice code getting complex',
  },
  'build-validator': {
    category: 'universal',
    model: 'Haiku',
    isolation: 'none',
    pipelineStage: 'Stage 5: Verify',
    triggerType: 'automatic',
    triggerCommand: null,
    whenToUse: 'Before every commit. After merging worktree branches.',
    whatItDoes:
      'Quick validation — tests pass, build succeeds, lint clean. Fast and cheap (Haiku model).',
    expectBack: 'Pass/fail with specific errors if failed.',
    situationLabel: 'Are about to commit',
  },
  'verify-app': {
    category: 'universal',
    model: 'Sonnet',
    isolation: 'worktree',
    pipelineStage: 'Stage 5: Verify',
    triggerType: 'manual',
    triggerCommand: '/verify',
    whenToUse: 'Before creating a PR. After major changes.',
    whatItDoes:
      'Full end-to-end verification. Runs the app, tests all major flows, checks for regressions. More thorough than build-validator.',
    expectBack: 'Detailed verification report. Blocking issues listed.',
    situationLabel: 'Finished a task, ready for PR',
  },
  'upstream-watcher': {
    category: 'universal',
    model: 'Sonnet',
    isolation: 'none',
    pipelineStage: 'Stage 1: Context',
    triggerType: 'manual',
    triggerCommand: null,
    status: 'reserved',
    whenToUse:
      'Reserved for future revival. The /upstream-check slash command was retired in Phase 2 (2026-04); the agent definition is preserved so the scheduled GitHub Actions workflow (.github/workflows/upstream-check.yml) and any future on-demand variant have an established contract to revive.',
    whatItDoes:
      "Fetches anthropic-watch feeds, cross-references upstream changes against the project's scaffolded agents/commands/hooks/skills, and produces an impact report.",
    expectBack:
      'Impact report: which upstream changes affect this project, which are informational, and recommended actions.',
    situationLabel: 'Reserved — no in-session command currently invokes this agent',
  },

  // --- Frontend agents (2) ---

  'ui-reviewer': {
    category: 'frontend',
    model: 'Sonnet',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'After implementing or modifying UI components. When adding new pages or layouts. During design system changes.',
    whatItDoes:
      'Reviews UI components for consistency, accessibility, responsiveness. Checks component hierarchy and prop patterns.',
    expectBack: 'UI review report with specific issues and accessibility findings.',
    situationLabel: 'Implemented or changed UI components',
  },
  'style-enforcer': {
    category: 'frontend',
    model: 'Haiku',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse: 'After CSS/styling changes. When new components are added. During theme updates.',
    whatItDoes:
      'Ensures design system compliance, catches CSS/styling drift, validates consistent spacing/colors/typography.',
    expectBack: 'List of design system violations with fix suggestions.',
    situationLabel: 'Made styling or CSS changes',
  },

  // --- Backend agents (3) ---

  'api-designer': {
    category: 'backend',
    model: 'Opus',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'Designing new API endpoints. Changing existing API contracts. Adding new routes or modifying request/response shapes.',
    whatItDoes:
      'Reviews API design for RESTful conventions, naming consistency, backward compatibility, request/response shape validation.',
    expectBack: 'Design review with specific recommendations.',
    situationLabel: 'Designed a new API endpoint',
  },
  'database-analyst': {
    category: 'backend',
    model: 'Sonnet',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse: 'Writing migrations. Changing schemas. Complex queries. Data integrity concerns.',
    whatItDoes:
      'Reviews schema design, migration safety, query performance, index usage, data integrity constraints.',
    expectBack: 'Analysis with specific concerns and recommendations.',
    situationLabel: 'Wrote a database migration or schema change',
  },
  'auth-auditor': {
    category: 'backend',
    model: 'Opus',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'Any change to authentication or authorization flow. New roles, permissions, token handling.',
    whatItDoes:
      'Reviews auth flows for correctness, token lifecycle, permission checks, session management, OWASP compliance.',
    expectBack: 'Audit report with pass/fail per check.',
    situationLabel: 'Changed auth or authorization logic',
  },

  // --- DevOps agents (4) ---

  'dependency-manager': {
    category: 'devops',
    model: 'Haiku',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'After adding new packages. During regular maintenance. When security advisories are published.',
    whatItDoes:
      'Audits, updates, and resolves dependency issues. Checks for security vulnerabilities in packages.',
    expectBack: 'Dependency audit report with update recommendations.',
    situationLabel: 'Added new dependencies or running maintenance',
  },
  'ci-fixer': {
    category: 'devops',
    model: 'Sonnet',
    isolation: 'worktree',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse: 'CI pipeline fails. Build errors in GitHub Actions/CI. Flaky tests blocking merges.',
    whatItDoes: 'Reads CI logs, identifies root cause, implements fix in worktree isolation.',
    expectBack: 'Fix committed to worktree branch with CI passing.',
    situationLabel: 'CI pipeline is failing',
  },
  'docker-helper': {
    category: 'devops',
    model: 'Sonnet',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'Creating or modifying Dockerfiles. Compose file changes. Multi-stage build optimization. Container debugging.',
    whatItDoes:
      'Manages containerization, Dockerfile optimization, compose file configuration, multi-stage builds.',
    expectBack: 'Optimized Docker configuration with size/performance improvements.',
    situationLabel: 'Working with Docker or containers',
  },
  'deploy-validator': {
    category: 'devops',
    model: 'Sonnet',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'Before deploying to staging or production. After infrastructure changes. New environment setup.',
    whatItDoes:
      'Validates deployment readiness — environment configs, secrets management, health checks, rollback strategy.',
    expectBack: 'Deployment readiness checklist with pass/fail.',
    situationLabel: 'Preparing for deployment',
  },

  // --- Quality agents (6) ---

  'bug-fixer': {
    category: 'quality',
    model: 'Sonnet',
    isolation: 'worktree',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      "Bug reported. Test failing. Error in logs. Something broke but you don't want to derail current work.",
    whatItDoes:
      'Investigates the bug in isolation. Reads logs, reproduces, finds root cause, implements fix, writes regression test.',
    expectBack: 'Fix committed to worktree branch with regression test.',
    situationLabel: 'Got a bug report mid-task',
  },
  'security-reviewer': {
    category: 'quality',
    model: 'Opus',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'Auth changes. User input handling. New API endpoints exposed to external users. Dependency updates.',
    whatItDoes:
      'Scans for injection vulnerabilities, auth bypasses, data exposure, insecure defaults, dependency vulnerabilities.',
    expectBack: 'Security report with severity ratings.',
    situationLabel: 'Made security-sensitive changes',
  },
  'performance-auditor': {
    category: 'quality',
    model: 'Sonnet',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'Performance concern raised. Slow endpoint discovered. Before releasing to production. After major changes.',
    whatItDoes:
      'Profiles code, identifies bottlenecks, checks database query efficiency, measures response times, suggests optimizations.',
    expectBack: 'Performance report with benchmarks and recommendations.',
    situationLabel: 'Suspect performance issues',
  },
  refactorer: {
    category: 'quality',
    model: 'Sonnet',
    isolation: 'worktree',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'Large-scale renames. Architectural pattern changes. Library migrations. Moving code between modules.',
    whatItDoes:
      'Handles large-scale refactoring in worktree isolation. Renames, architectural changes, pattern migrations with full test verification.',
    expectBack: 'Refactored code on worktree branch with all tests passing.',
    situationLabel: 'Need large-scale refactoring',
  },
  'build-fixer': {
    category: 'quality',
    model: 'Sonnet',
    isolation: 'worktree',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'Build is broken. Tests failing. Lint errors blocking commit. Type errors after a merge or dependency update.',
    whatItDoes:
      'Reads error output, categorizes failures (build/test/lint/type), fixes in priority order, verifies each fix. Works in worktree isolation.',
    expectBack: 'All checks passing, with a summary of what was fixed and why.',
    situationLabel: 'Build or tests are broken',
  },
  // --- Documentation agents (2) ---

  'doc-writer': {
    category: 'documentation',
    model: 'Sonnet',
    isolation: 'worktree',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'After implementing new features. After API changes. When README is outdated. Before release.',
    whatItDoes:
      'Updates documentation, README, API docs from code changes. Keeps docs in sync with implementation.',
    expectBack: 'Updated docs committed to worktree branch.',
    situationLabel: 'Need docs updated after implementation',
  },
  'changelog-generator': {
    category: 'documentation',
    model: 'Haiku',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'Before releasing a new version. After merging a batch of PRs. When preparing release notes.',
    whatItDoes:
      'Generates changelogs from git history, PR descriptions, and commit messages. Formats for release notes.',
    expectBack: 'Formatted changelog entry for the release.',
    situationLabel: 'Preparing a release',
  },

  // --- Data / AI agents (3) ---

  'data-pipeline-reviewer': {
    category: 'data',
    model: 'Sonnet',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'New data pipeline created. ETL logic changed. Data transformation modified. Schema compatibility concerns.',
    whatItDoes:
      'Reviews data flows, validates transformations, checks for data loss, validates schema compatibility.',
    expectBack: 'Pipeline review with data integrity concerns.',
    situationLabel: 'Created or changed a data pipeline',
  },
  'ml-experiment-tracker': {
    category: 'data',
    model: 'Sonnet',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'Running ML experiments. Comparing model performance. Hyperparameter tuning. Model selection.',
    whatItDoes:
      'Tracks ML experiments, compares metrics across runs, documents hyperparameters and results.',
    expectBack: 'Experiment comparison report with recommendations.',
    situationLabel: 'Running or comparing ML experiments',
  },
  'prompt-engineer': {
    category: 'data',
    model: 'Opus',
    isolation: 'none',
    triggerType: 'manual',
    triggerCommand: null,
    whenToUse:
      'Writing LLM prompts. Optimizing prompt performance. Building prompt chains. Testing prompt variations.',
    whatItDoes:
      'Reviews and optimizes LLM prompts and chains. Tests prompt variations, measures output quality.',
    expectBack: 'Optimized prompts with test results and quality comparison.',
    situationLabel: 'Writing or optimizing LLM prompts',
  },
};
