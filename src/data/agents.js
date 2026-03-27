export const UNIVERSAL_AGENTS = [
  'plan-reviewer',
  'code-simplifier',
  'test-writer',
  'build-validator',
  'verify-app',
];

export const AGENT_CATALOG = {
  'ui-reviewer': {
    model: 'sonnet',
    isolation: 'none',
    category: 'frontend',
    description: 'Reviews UI for consistency and accessibility',
  },
  'style-enforcer': {
    model: 'haiku',
    isolation: 'none',
    category: 'frontend',
    description: 'Ensures design system compliance',
  },
  'api-designer': {
    model: 'opus',
    isolation: 'none',
    category: 'backend',
    description: 'Reviews API design for RESTful conventions',
  },
  'database-analyst': {
    model: 'sonnet',
    isolation: 'none',
    category: 'backend',
    description: 'Reviews database schemas and queries',
  },
  'auth-auditor': {
    model: 'opus',
    isolation: 'none',
    category: 'backend',
    description: 'Audits authentication and authorization',
  },
  'security-reviewer': {
    model: 'opus',
    isolation: 'none',
    category: 'quality',
    description: 'Reviews code for security vulnerabilities',
  },
  'performance-auditor': {
    model: 'sonnet',
    isolation: 'none',
    category: 'quality',
    description: 'Analyzes code for performance issues',
  },
  'bug-fixer': {
    model: 'sonnet',
    isolation: 'worktree',
    category: 'quality',
    description: 'Diagnoses and fixes bugs',
  },
  refactorer: {
    model: 'sonnet',
    isolation: 'worktree',
    category: 'quality',
    description: 'Refactors code to improve maintainability',
  },
  'dependency-manager': {
    model: 'haiku',
    isolation: 'none',
    category: 'devops',
    description: 'Reviews dependency health and updates',
  },
  'ci-fixer': {
    model: 'sonnet',
    isolation: 'worktree',
    category: 'devops',
    description: 'Diagnoses and fixes CI/CD failures',
  },
  'docker-helper': {
    model: 'sonnet',
    isolation: 'none',
    category: 'devops',
    description: 'Reviews Docker configs for best practices',
  },
  'deploy-validator': {
    model: 'sonnet',
    isolation: 'none',
    category: 'devops',
    description: 'Validates deployment readiness',
  },
  'doc-writer': {
    model: 'sonnet',
    isolation: 'worktree',
    category: 'docs',
    description: 'Writes and updates documentation',
  },
  'changelog-generator': {
    model: 'haiku',
    isolation: 'none',
    category: 'docs',
    description: 'Generates changelog from commits',
  },
  'data-pipeline-reviewer': {
    model: 'sonnet',
    isolation: 'none',
    category: 'data',
    description: 'Reviews data pipeline correctness',
  },
  'ml-experiment-tracker': {
    model: 'sonnet',
    isolation: 'none',
    category: 'data',
    description: 'Reviews ML experiment reproducibility',
  },
  'prompt-engineer': {
    model: 'opus',
    isolation: 'none',
    category: 'data',
    description: 'Reviews and improves LLM prompts',
  },
};

export const CATEGORY_RECOMMENDATIONS = {
  'Full-stack web application': [
    'ui-reviewer',
    'api-designer',
    'database-analyst',
    'security-reviewer',
    'bug-fixer',
    'doc-writer',
  ],
  'Backend / API': [
    'api-designer',
    'database-analyst',
    'security-reviewer',
    'auth-auditor',
    'bug-fixer',
    'performance-auditor',
  ],
  'Frontend / UI': ['ui-reviewer', 'style-enforcer', 'performance-auditor', 'bug-fixer'],
  'CLI tool': ['bug-fixer', 'doc-writer', 'dependency-manager'],
  'Data / ML / AI': [
    'data-pipeline-reviewer',
    'ml-experiment-tracker',
    'prompt-engineer',
    'database-analyst',
  ],
  'Library / Package': [
    'doc-writer',
    'dependency-manager',
    'performance-auditor',
    'refactorer',
    'changelog-generator',
  ],
  'DevOps / Infrastructure': [
    'ci-fixer',
    'docker-helper',
    'deploy-validator',
    'dependency-manager',
  ],
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
  'setup',
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
  { name: 'Java', value: 'java' },
  { name: 'C# / .NET', value: 'csharp' },
  { name: 'C / C++', value: 'cpp' },
  { name: 'Go', value: 'go' },
  { name: 'PHP', value: 'php' },
  { name: 'Ruby', value: 'ruby' },
  { name: 'Kotlin', value: 'kotlin' },
  { name: 'Swift', value: 'swift' },
  { name: 'Rust', value: 'rust' },
  { name: 'Dart / Flutter', value: 'dart' },
  { name: 'Scala', value: 'scala' },
  { name: 'Elixir', value: 'elixir' },
  { name: 'Zig', value: 'zig' },
  { name: 'Other / None', value: 'other' },
];

export const PROJECT_TYPE_DESCRIPTIONS = {
  'Full-stack web application': 'Frontend + backend in one repo',
  'Backend / API': 'Server, REST/GraphQL, no frontend',
  'Frontend / UI': 'Client-side app, no backend',
  'CLI tool': 'Command-line application',
  'Data / ML / AI': 'Data pipelines, ML models, LLM apps',
  'Library / Package': 'Reusable module published to npm/PyPI',
  'DevOps / Infrastructure': 'Infrastructure, CI/CD, deployment',
};

export const AGENT_CATEGORIES = {
  Backend: {
    agents: ['api-designer', 'database-analyst', 'auth-auditor'],
    description: 'api-designer, database-analyst, auth-auditor',
  },
  Frontend: {
    agents: ['ui-reviewer', 'style-enforcer'],
    description: 'ui-reviewer, style-enforcer',
  },
  DevOps: {
    agents: ['ci-fixer', 'docker-helper', 'deploy-validator', 'dependency-manager'],
    description: 'ci-fixer, docker-helper, deploy-validator, dependency-manager',
  },
  Quality: {
    agents: ['bug-fixer', 'security-reviewer', 'performance-auditor', 'refactorer'],
    description: 'bug-fixer, security-reviewer, performance-auditor, refactorer',
  },
  Documentation: {
    agents: ['doc-writer', 'changelog-generator'],
    description: 'doc-writer, changelog-generator',
  },
  'Data / AI': {
    agents: ['data-pipeline-reviewer', 'ml-experiment-tracker', 'prompt-engineer'],
    description: 'data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer',
  },
};

export const PROJECT_TYPE_TO_CATEGORIES = {
  'Full-stack web application': ['Backend', 'Frontend', 'Quality', 'Documentation'],
  'Backend / API': ['Backend', 'Quality'],
  'Frontend / UI': ['Frontend', 'Quality'],
  'CLI tool': ['Quality', 'Documentation'],
  'Data / ML / AI': ['Data / AI', 'Backend'],
  'Library / Package': ['Quality', 'Documentation'],
  'DevOps / Infrastructure': ['DevOps'],
};

export const SPEC_MD_TEMPLATE_MAP = {
  'Full-stack web application': 'specs/spec-md-fullstack.md',
  'Backend / API': 'specs/spec-md-backend.md',
  'Frontend / UI': 'specs/spec-md-frontend.md',
  'CLI tool': 'specs/spec-md-cli.md',
  'Data / ML / AI': 'specs/spec-md-data.md',
  'Library / Package': 'specs/spec-md-library.md',
  'DevOps / Infrastructure': 'specs/spec-md-devops.md',
};

export const CONFIRMATION_STEPS = [
  { name: 'Project name and description', value: 'projectInfo' },
  { name: 'Project type', value: 'projectType' },
  { name: 'Tech stack', value: 'techStack' },
  { name: 'Agent selection', value: 'agents' },
];

export const NOTIFICATION_COMMANDS = {
  linux: "notify-send 'Claude Code' 'Session needs attention' 2>/dev/null || true",
  darwin: `osascript -e 'display notification "Session needs attention" with title "Claude Code"' 2>/dev/null || true`,
  win32: `powershell -command "New-BurntToastNotification -Text 'Claude Code','Session needs attention'" 2>/dev/null || true`,
};
