export const UNIVERSAL_AGENTS = [
  'plan-reviewer',
  'code-simplifier',
  'test-writer',
  'build-validator',
  'verify-app',
];

export const AGENT_CATALOG = {
  'ui-reviewer': { model: 'sonnet', isolation: 'none', category: 'frontend', description: 'Reviews UI for consistency and accessibility' },
  'style-enforcer': { model: 'haiku', isolation: 'none', category: 'frontend', description: 'Ensures design system compliance' },
  'api-designer': { model: 'opus', isolation: 'none', category: 'backend', description: 'Reviews API design for RESTful conventions' },
  'database-analyst': { model: 'sonnet', isolation: 'none', category: 'backend', description: 'Reviews database schemas and queries' },
  'auth-auditor': { model: 'opus', isolation: 'none', category: 'backend', description: 'Audits authentication and authorization' },
  'security-reviewer': { model: 'opus', isolation: 'none', category: 'quality', description: 'Reviews code for security vulnerabilities' },
  'performance-auditor': { model: 'sonnet', isolation: 'none', category: 'quality', description: 'Analyzes code for performance issues' },
  'bug-fixer': { model: 'sonnet', isolation: 'worktree', category: 'quality', description: 'Diagnoses and fixes bugs' },
  'refactorer': { model: 'sonnet', isolation: 'worktree', category: 'quality', description: 'Refactors code to improve maintainability' },
  'dependency-manager': { model: 'haiku', isolation: 'none', category: 'devops', description: 'Reviews dependency health and updates' },
  'ci-fixer': { model: 'sonnet', isolation: 'worktree', category: 'devops', description: 'Diagnoses and fixes CI/CD failures' },
  'docker-helper': { model: 'sonnet', isolation: 'none', category: 'devops', description: 'Reviews Docker configs for best practices' },
  'deploy-validator': { model: 'sonnet', isolation: 'none', category: 'devops', description: 'Validates deployment readiness' },
  'doc-writer': { model: 'sonnet', isolation: 'worktree', category: 'docs', description: 'Writes and updates documentation' },
  'changelog-generator': { model: 'haiku', isolation: 'none', category: 'docs', description: 'Generates changelog from commits' },
  'data-pipeline-reviewer': { model: 'sonnet', isolation: 'none', category: 'data', description: 'Reviews data pipeline correctness' },
  'ml-experiment-tracker': { model: 'sonnet', isolation: 'none', category: 'data', description: 'Reviews ML experiment reproducibility' },
  'prompt-engineer': { model: 'opus', isolation: 'none', category: 'data', description: 'Reviews and improves LLM prompts' },
};

export const CATEGORY_RECOMMENDATIONS = {
  'Full-stack web application': ['ui-reviewer', 'api-designer', 'database-analyst', 'security-reviewer', 'bug-fixer', 'doc-writer'],
  'Backend / API': ['api-designer', 'database-analyst', 'security-reviewer', 'auth-auditor', 'bug-fixer', 'performance-auditor'],
  'Frontend / UI': ['ui-reviewer', 'style-enforcer', 'performance-auditor', 'bug-fixer'],
  'CLI tool': ['bug-fixer', 'doc-writer', 'dependency-manager'],
  'Data / ML / AI': ['data-pipeline-reviewer', 'ml-experiment-tracker', 'prompt-engineer', 'database-analyst'],
  'Library / Package': ['doc-writer', 'dependency-manager', 'performance-auditor', 'refactorer', 'changelog-generator'],
  'DevOps / Infrastructure': ['ci-fixer', 'docker-helper', 'deploy-validator', 'dependency-manager'],
};

export const COMMAND_FILES = [
  'start',
  'end',
  'commit-push-pr',
  'review-plan',
  'techdebt',
  'verify',
  'compact-safe',
  'status',
  'update-claude-md',
];

export const UNIVERSAL_SKILLS = [
  'context-management',
  'git-conventions',
  'planning-with-files',
  'review-and-handoff',
  'prompt-engineering',
  'verification',
  'testing',
  'claude-md-maintenance',
  'subagent-usage',
];

export const TEMPLATE_SKILLS = [
  'backend-conventions',
  'frontend-design-system',
  'project-patterns',
];

export const PROJECT_TYPES = [
  'Full-stack web application',
  'Backend / API',
  'Frontend / UI',
  'CLI tool',
  'Data / ML / AI',
  'Library / Package',
  'DevOps / Infrastructure',
];

export const TECH_STACKS = [
  { name: 'Python', value: 'python' },
  { name: 'Node.js / TypeScript', value: 'node' },
  { name: 'Rust', value: 'rust' },
  { name: 'Go', value: 'go' },
  { name: 'Other / None', value: 'other' },
];

export const FORMATTER_COMMANDS = {
  python: 'ruff format . || true',
  node: 'npx prettier --write . || true',
  rust: 'cargo fmt || true',
  go: 'gofmt -w . || true',
};

export const NOTIFICATION_COMMANDS = {
  linux: "notify-send 'Claude Code' 'Session needs attention' 2>/dev/null || true",
  darwin: `osascript -e 'display notification "Session needs attention" with title "Claude Code"' 2>/dev/null || true`,
  win32: `powershell -command "New-BurntToastNotification -Text 'Claude Code','Session needs attention'" 2>/dev/null || true`,
};
