/**
 * Step data for the multi-terminal workflow demo.
 *
 * Shape reference:
 *   Level  { name, subtitle, columns, terminals, steps }
 *   Terminal { role, row, col, span, branch }
 *   Step   { stage, title, active, modes, lines, arrow? }
 *   Line   { type, text }
 *
 * Line types: user | agent | tool | result | ok | sub | shell | dim | warn
 */

export const tabOrder = ['2', '3', '4', '5', 'boris'];

export const tabLabels = {
  2: 'Level 2',
  3: 'Level 3',
  4: 'Level 4',
  5: 'Level 5',
  boris: 'Boris Mode',
};

export const stageColors = {
  setup: '#777',
  start: '#6bf',
  plan: '#da5',
  review: '#a8e',
  execute: '#eb5',
  simplify: '#6cb',
  verify: '#5d8',
  ship: '#5d8',
  done: '#5d8',
};

// ---------------------------------------------------------------------------
// Level 2 — "Getting Started" (2 terminals, 1 column)
// ---------------------------------------------------------------------------
const level2 = {
  name: 'Level 2',
  subtitle: '2 terminals — one task, one pipeline',
  columns: 1,
  terminals: {
    t1: { role: 'Executor', row: 0, col: 0, span: 1, branch: 'feat/rate-limiting' },
    t2: { role: 'Reviewer', row: 1, col: 0, span: 1, branch: 'feat/rate-limiting' },
  },
  steps: [
    {
      stage: 'setup',
      title: 'Prepare terminals',
      active: ['t1', 't2'],
      modes: {},
      lines: {
        t1: [
          { type: 'dim', text: '# Terminal 1 — main checkout' },
          { type: 'shell', text: '$ cd ~/project && git checkout -b feat/rate-limiting' },
          { type: 'shell', text: '$ claude' },
        ],
        t2: [
          { type: 'dim', text: '# Terminal 2 — reviewer worktree' },
          { type: 'shell', text: '$ cd ~/project && claude --worktree' },
        ],
      },
    },
    {
      stage: 'start',
      title: '/start',
      active: ['t1'],
      modes: { t1: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/start' },
          { type: 'agent', text: "● I'll read the project state and agent routing..." },
          { type: 'tool', text: '  Read(docs/spec/PROGRESS.md)' },
          { type: 'result', text: '  └ Done' },
          { type: 'tool', text: '  Read(.claude/skills/agent-routing.md)' },
          { type: 'result', text: '  └ Done' },
          {
            type: 'agent',
            text: '● Ready. Last completed: auth module. Next: add rate limiting to API.',
          },
        ],
      },
    },
    {
      stage: 'plan',
      title: 'Plan mode',
      active: ['t1'],
      modes: { t1: 'plan mode' },
      lines: {
        t1: [
          {
            type: 'user',
            text: 'Add rate limiting middleware to all API endpoints. Use express-rate-limit, 100 req/15min per IP.',
          },
          { type: 'agent', text: "● I'll plan this implementation:" },
          { type: 'agent', text: '  1. Install express-rate-limit' },
          { type: 'agent', text: '  2. Create src/middleware/rate-limiter.js' },
          { type: 'agent', text: '  3. Apply to all routes in src/routes/api.js' },
          { type: 'agent', text: '  4. Add tests in tests/middleware/rate-limiter.test.js' },
        ],
      },
    },
    {
      stage: 'review',
      title: 'Copy plan → review',
      active: ['t2'],
      modes: { t2: 'auto-accept' },
      arrow: { from: 't1', to: 't2', label: 'plan' },
      lines: {
        t2: [
          { type: 'user', text: '/review-plan' },
          { type: 'user', text: 'Review this plan: [pasted plan from T1]' },
          { type: 'agent', text: "● I'll review this as a staff engineer..." },
          { type: 'tool', text: '  Read(src/routes/api.js)' },
          { type: 'result', text: '  └ 142 lines' },
          {
            type: 'agent',
            text: '● Plan is solid. Add X-RateLimit-Remaining and X-RateLimit-Reset headers.',
          },
        ],
      },
    },
    {
      stage: 'review',
      title: 'Feedback → update plan',
      active: ['t1'],
      modes: { t1: 'plan mode' },
      arrow: { from: 't2', to: 't1', label: 'feedback' },
      lines: {
        t1: [
          { type: 'user', text: 'Reviewer says: add X-RateLimit headers. Update the plan.' },
          {
            type: 'agent',
            text: '● Updated. Setting standardHeaders: true adds headers automatically.',
          },
        ],
      },
    },
    {
      stage: 'execute',
      title: 'Auto-accept → execute',
      active: ['t1'],
      modes: { t1: 'auto-accept' },
      lines: {
        t1: [
          { type: 'agent', text: "● I'll implement the plan now." },
          { type: 'tool', text: '  Bash(npm install express-rate-limit)' },
          { type: 'result', text: '  └ added 1 package' },
          { type: 'tool', text: '  Write(src/middleware/rate-limiter.js)' },
          { type: 'result', text: '  └ Created (28 lines)' },
          { type: 'tool', text: '  Edit(src/routes/api.js)' },
          { type: 'result', text: '  └ Modified (+3 lines)' },
          { type: 'tool', text: '  Write(tests/middleware/rate-limiter.test.js)' },
          { type: 'result', text: '  └ Created (45 lines)' },
          { type: 'tool', text: '  Bash(npm test 2>&1 | tail -5)' },
          { type: 'ok', text: '  └ ✓ 196 tests passing' },
        ],
      },
    },
    {
      stage: 'simplify',
      title: '/simplify',
      active: ['t2'],
      modes: { t2: 'auto-accept' },
      arrow: { from: 't1', to: 't2', label: 'done' },
      lines: {
        t2: [
          { type: 'user', text: '/simplify' },
          {
            type: 'agent',
            text: '● Running 3 review agents in parallel... (ctrl+o to expand)',
          },
          { type: 'sub', text: '  ├─ Code reuse review · 8 tool uses · 22.1k tokens' },
          { type: 'sub', text: '  ├─ Code quality review · 5 tool uses · 18.4k tokens' },
          { type: 'sub', text: '  └─ Efficiency review · 4 tool uses · 15.2k tokens' },
          { type: 'agent', text: '● No issues found. Clean implementation.' },
        ],
      },
    },
    {
      stage: 'verify',
      title: '/verify',
      active: ['t1'],
      modes: { t1: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/verify' },
          { type: 'agent', text: '● Running full verification...' },
          { type: 'tool', text: '  Bash(npm test 2>&1 | tail -5)' },
          { type: 'ok', text: '  └ ✓ 196 tests passing (12 new)' },
          { type: 'tool', text: '  Bash(npm run lint 2>&1)' },
          { type: 'ok', text: '  └ ✓ 0 errors, 0 warnings' },
          { type: 'agent', text: '● All checks pass. Ready to ship.' },
        ],
      },
    },
    {
      stage: 'ship',
      title: '/commit-push-pr',
      active: ['t1'],
      modes: { t1: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/commit-push-pr' },
          { type: 'tool', text: '  Bash(git add -A)' },
          { type: 'result', text: '  └ Done' },
          { type: 'tool', text: '  Bash(git commit -m "feat: add rate limiting middleware")' },
          { type: 'result', text: '  └ [feat/rate-limiting 3a8f2c1]' },
          { type: 'tool', text: '  Bash(git push origin feat/rate-limiting)' },
          { type: 'result', text: '  └ Done' },
          {
            type: 'tool',
            text: '  Bash(gh pr create --base develop --title "feat: add rate limiting"...)',
          },
          { type: 'ok', text: '  └ ✓ PR #12 created → develop' },
        ],
      },
    },
    {
      stage: 'done',
      title: 'Post-merge',
      active: [],
      modes: {},
      lines: {},
    },
  ],
};

// ---------------------------------------------------------------------------
// Level 3 — "Comfortable" (3 terminals, 2 columns)
// ---------------------------------------------------------------------------
const level3 = {
  name: 'Level 3',
  subtitle: '3 terminals — two tasks, shared reviewer',
  columns: 2,
  terminals: {
    t1: { role: 'Executor A', row: 0, col: 0, span: 1, branch: 'feat/rate-limiting' },
    t2: { role: 'Executor B', row: 0, col: 1, span: 1, branch: 'fix/auth-bug' },
    t3: { role: 'Reviewer', row: 1, col: 0, span: 2, branch: 'feat/rate-limiting' },
  },
  steps: [
    {
      stage: 'setup',
      title: 'Prepare terminals',
      active: ['t1', 't2', 't3'],
      modes: {},
      lines: {
        t1: [
          { type: 'dim', text: '# Terminal 1 — main checkout' },
          { type: 'shell', text: '$ cd ~/project && git checkout -b feat/rate-limiting' },
          { type: 'shell', text: '$ claude' },
        ],
        t2: [
          { type: 'dim', text: '# Terminal 2 — worktree for Task B' },
          {
            type: 'shell',
            text: '$ git worktree add -b fix/auth-bug ../project-B develop',
          },
          { type: 'shell', text: '$ cd ../project-B && claude' },
        ],
        t3: [
          { type: 'dim', text: '# Terminal 3 — shared reviewer' },
          { type: 'shell', text: '$ cd ~/project && claude --worktree' },
        ],
      },
    },
    {
      stage: 'start',
      title: '/start both',
      active: ['t1', 't2'],
      modes: { t1: 'auto-accept', t2: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/start' },
          { type: 'agent', text: '● Ready. Next: add rate limiting to API.' },
        ],
        t2: [
          { type: 'user', text: '/start' },
          { type: 'agent', text: '● Ready. Next: fix auth token refresh bug.' },
        ],
      },
    },
    {
      stage: 'plan',
      title: 'Plan Task A',
      active: ['t1'],
      modes: { t1: 'plan mode' },
      lines: {
        t1: [
          { type: 'user', text: 'Add rate limiting middleware. 100 req/15min per IP.' },
          { type: 'agent', text: "● I'll plan this:" },
          { type: 'agent', text: '  1. Install express-rate-limit' },
          { type: 'agent', text: '  2. Create middleware + apply to routes' },
          { type: 'agent', text: '  3. Add tests' },
        ],
      },
    },
    {
      stage: 'plan',
      title: "Don't wait — plan Task B",
      active: ['t1', 't2'],
      modes: { t1: 'plan mode', t2: 'plan mode' },
      lines: {
        t2: [
          { type: 'user', text: 'Fix: refresh token rejected after password change.' },
          { type: 'agent', text: "● I'll plan this:" },
          { type: 'agent', text: '  1. Invalidate tokens on password change' },
          { type: 'agent', text: '  2. Update token-store.js with revocation check' },
          { type: 'agent', text: '  3. Add regression test' },
        ],
      },
    },
    {
      stage: 'review',
      title: 'Review Task A plan',
      active: ['t3'],
      modes: { t3: 'auto-accept' },
      arrow: { from: 't1', to: 't3', label: 'plan A' },
      lines: {
        t3: [
          { type: 'user', text: 'Review this plan: [rate limiting plan from T1]' },
          { type: 'agent', text: "● I'll review as a staff engineer..." },
          { type: 'tool', text: '  Read(src/routes/api.js)' },
          { type: 'result', text: '  └ 142 lines' },
          { type: 'agent', text: '● Add standardHeaders: true for X-RateLimit headers.' },
        ],
      },
    },
    {
      stage: 'review',
      title: 'Feedback → update plan A',
      active: ['t1'],
      modes: { t1: 'plan mode' },
      arrow: { from: 't3', to: 't1', label: 'feedback' },
      lines: {
        t1: [
          { type: 'user', text: 'Reviewer: add standardHeaders. Update plan.' },
          { type: 'agent', text: '● Updated. standardHeaders: true covers it.' },
        ],
      },
    },
    {
      stage: 'execute',
      title: 'Execute both tasks',
      active: ['t1', 't2'],
      modes: { t1: 'auto-accept', t2: 'auto-accept' },
      lines: {
        t1: [
          { type: 'agent', text: '● Implementing rate limiting...' },
          { type: 'tool', text: '  Bash(npm install express-rate-limit)' },
          { type: 'result', text: '  └ added 1 package' },
          { type: 'tool', text: '  Write(src/middleware/rate-limiter.js)' },
          { type: 'result', text: '  └ Created (28 lines)' },
          { type: 'tool', text: '  Bash(npm test 2>&1 | tail -5)' },
          { type: 'ok', text: '  └ ✓ 196 tests passing' },
        ],
        t2: [
          { type: 'agent', text: '● Fixing token refresh...' },
          { type: 'tool', text: '  Edit(src/auth/token-store.js)' },
          { type: 'result', text: '  └ Modified (+12 lines)' },
          { type: 'tool', text: '  Write(tests/auth/token-revoke.test.js)' },
          { type: 'result', text: '  └ Created (32 lines)' },
          { type: 'tool', text: '  Bash(npm test 2>&1 | tail -5)' },
          { type: 'ok', text: '  └ ✓ 201 tests passing' },
        ],
      },
    },
    {
      stage: 'simplify',
      title: '/simplify Task A',
      active: ['t3'],
      modes: { t3: 'auto-accept' },
      arrow: { from: 't1', to: 't3', label: 'done' },
      lines: {
        t3: [
          { type: 'user', text: '/simplify' },
          { type: 'agent', text: '● Running 3 review agents...' },
          { type: 'sub', text: '  ├─ Code reuse · 8 tool uses · Done' },
          { type: 'sub', text: '  ├─ Quality · 5 tool uses · Done' },
          { type: 'sub', text: '  └─ Efficiency · 4 tool uses · Done' },
          { type: 'agent', text: '● Clean. No issues.' },
        ],
      },
    },
    {
      stage: 'verify',
      title: '/verify both',
      active: ['t1', 't2'],
      modes: { t1: 'auto-accept', t2: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/verify' },
          { type: 'tool', text: '  Bash(npm test && npm run lint)' },
          { type: 'ok', text: '  └ ✓ All checks pass' },
        ],
        t2: [
          { type: 'user', text: '/verify' },
          { type: 'tool', text: '  Bash(npm test && npm run lint)' },
          { type: 'ok', text: '  └ ✓ All checks pass' },
        ],
      },
    },
    {
      stage: 'ship',
      title: '/commit-push-pr both',
      active: ['t1', 't2'],
      modes: { t1: 'auto-accept', t2: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/commit-push-pr' },
          { type: 'tool', text: '  Bash(git commit -m "feat: add rate limiting")' },
          { type: 'result', text: '  └ [feat/rate-limiting 3a8f2c1]' },
          { type: 'ok', text: '  └ ✓ PR #12 created → develop' },
        ],
        t2: [
          { type: 'user', text: '/commit-push-pr' },
          {
            type: 'tool',
            text: '  Bash(git commit -m "fix: token refresh after password change")',
          },
          { type: 'result', text: '  └ [fix/auth-bug a1b2c3d]' },
          { type: 'ok', text: '  └ ✓ PR #13 created → develop' },
        ],
      },
    },
    {
      stage: 'done',
      title: 'Post-merge',
      active: [],
      modes: {},
      lines: {},
    },
  ],
};

// ---------------------------------------------------------------------------
// Level 4 — "Productive" (4 terminals, 2 columns)
// ---------------------------------------------------------------------------
const level4 = {
  name: 'Level 4',
  subtitle: '4 terminals — two full independent pipelines',
  columns: 2,
  terminals: {
    t1: { role: 'Executor A', row: 0, col: 0, span: 1, branch: 'feat/rate-limiting' },
    t2: { role: 'Executor B', row: 0, col: 1, span: 1, branch: 'fix/auth-bug' },
    t3: { role: 'Reviewer A', row: 1, col: 0, span: 1, branch: 'feat/rate-limiting' },
    t4: { role: 'Reviewer B', row: 1, col: 1, span: 1, branch: 'fix/auth-bug' },
  },
  steps: [
    {
      stage: 'setup',
      title: 'Prepare terminals',
      active: ['t1', 't2', 't3', 't4'],
      modes: {},
      lines: {
        t1: [
          { type: 'dim', text: '# Executor A — main' },
          { type: 'shell', text: '$ git checkout -b feat/rate-limiting && claude' },
        ],
        t2: [
          { type: 'dim', text: '# Executor B — worktree' },
          { type: 'shell', text: '$ git worktree add -b fix/auth-bug ../project-B develop' },
          { type: 'shell', text: '$ cd ../project-B && claude' },
        ],
        t3: [
          { type: 'dim', text: '# Reviewer A — worktree' },
          { type: 'shell', text: '$ claude --worktree' },
        ],
        t4: [
          { type: 'dim', text: '# Reviewer B — worktree' },
          { type: 'shell', text: '$ cd ../project-B && claude --worktree' },
        ],
      },
    },
    {
      stage: 'start',
      title: '/start both executors',
      active: ['t1', 't2'],
      modes: { t1: 'auto-accept', t2: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/start' },
          { type: 'agent', text: '● Ready. Next: rate limiting middleware.' },
        ],
        t2: [
          { type: 'user', text: '/start' },
          { type: 'agent', text: '● Ready. Next: fix auth token refresh.' },
        ],
      },
    },
    {
      stage: 'plan',
      title: 'Plan both tasks',
      active: ['t1', 't2'],
      modes: { t1: 'plan mode', t2: 'plan mode' },
      lines: {
        t1: [
          { type: 'user', text: 'Add rate limiting. 100 req/15min per IP.' },
          { type: 'agent', text: '● Plan: install, create middleware, apply, test.' },
        ],
        t2: [
          { type: 'user', text: 'Fix: refresh token rejected after password change.' },
          { type: 'agent', text: '● Plan: add revocation check, update store, test.' },
        ],
      },
    },
    {
      stage: 'review',
      title: 'Review both plans',
      active: ['t3', 't4'],
      modes: { t3: 'auto-accept', t4: 'auto-accept' },
      arrow: { from: 't1', to: 't3', label: 'plan A' },
      lines: {
        t3: [
          { type: 'user', text: 'Review: [rate limiting plan]' },
          { type: 'tool', text: '  Read(src/routes/api.js)' },
          { type: 'result', text: '  └ 142 lines' },
          { type: 'agent', text: '● Add standardHeaders: true.' },
        ],
        t4: [
          { type: 'user', text: 'Review: [token fix plan]' },
          { type: 'tool', text: '  Read(src/auth/token-store.js)' },
          { type: 'result', text: '  └ 89 lines' },
          { type: 'agent', text: '● Add token version check to invalidate old tokens.' },
        ],
      },
    },
    {
      stage: 'review',
      title: 'Feedback → update plans',
      active: ['t1', 't2'],
      modes: { t1: 'plan mode', t2: 'plan mode' },
      arrow: { from: 't3', to: 't1', label: 'feedback' },
      lines: {
        t1: [
          { type: 'user', text: 'Add standardHeaders: true. Update plan.' },
          { type: 'agent', text: '● Updated.' },
        ],
        t2: [
          { type: 'user', text: 'Add token version check. Update plan.' },
          { type: 'agent', text: '● Updated. Will add version field to JWT payload.' },
        ],
      },
    },
    {
      stage: 'execute',
      title: 'Execute both — in parallel',
      active: ['t1', 't2'],
      modes: { t1: 'auto-accept', t2: 'auto-accept' },
      lines: {
        t1: [
          { type: 'agent', text: '● Implementing rate limiting...' },
          { type: 'tool', text: '  Write(src/middleware/rate-limiter.js)' },
          { type: 'result', text: '  └ Created (28 lines)' },
          { type: 'tool', text: '  Bash(npm test 2>&1 | tail -5)' },
          { type: 'ok', text: '  └ ✓ 196 tests passing' },
        ],
        t2: [
          { type: 'agent', text: '● Fixing token refresh...' },
          { type: 'tool', text: '  Edit(src/auth/token-store.js)' },
          { type: 'result', text: '  └ Modified (+12 lines)' },
          { type: 'tool', text: '  Bash(npm test 2>&1 | tail -5)' },
          { type: 'ok', text: '  └ ✓ 201 tests passing' },
        ],
      },
    },
    {
      stage: 'simplify',
      title: '/simplify both',
      active: ['t3', 't4'],
      modes: { t3: 'auto-accept', t4: 'auto-accept' },
      arrow: { from: 't1', to: 't3', label: 'done' },
      lines: {
        t3: [
          { type: 'user', text: '/simplify' },
          { type: 'agent', text: '● Running review agents...' },
          { type: 'sub', text: '  ├─ Reuse · Done' },
          { type: 'sub', text: '  └─ Quality · Done' },
          { type: 'agent', text: '● Clean.' },
        ],
        t4: [
          { type: 'user', text: '/simplify' },
          { type: 'agent', text: '● Running review agents...' },
          { type: 'sub', text: '  ├─ Reuse · Done' },
          { type: 'sub', text: '  └─ Quality · Done' },
          { type: 'agent', text: '● Clean.' },
        ],
      },
    },
    {
      stage: 'verify',
      title: '/verify both',
      active: ['t1', 't2'],
      modes: { t1: 'auto-accept', t2: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/verify' },
          { type: 'ok', text: '  └ ✓ All checks pass' },
        ],
        t2: [
          { type: 'user', text: '/verify' },
          { type: 'ok', text: '  └ ✓ All checks pass' },
        ],
      },
    },
    {
      stage: 'ship',
      title: '/commit-push-pr both',
      active: ['t1', 't2'],
      modes: { t1: 'auto-accept', t2: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/commit-push-pr' },
          { type: 'ok', text: '  └ ✓ PR #12 created → develop' },
        ],
        t2: [
          { type: 'user', text: '/commit-push-pr' },
          { type: 'ok', text: '  └ ✓ PR #13 created → develop' },
        ],
      },
    },
    {
      stage: 'done',
      title: 'Post-merge',
      active: [],
      modes: {},
      lines: {},
    },
  ],
};

// ---------------------------------------------------------------------------
// Level 5 — "Advanced" (6 terminals, 3 columns)
// ---------------------------------------------------------------------------
const level5 = {
  name: 'Level 5',
  subtitle: '6 terminals — three full pipelines',
  columns: 3,
  terminals: {
    t1: { role: 'Executor A', row: 0, col: 0, span: 1, branch: 'feat/rate-limiting' },
    t2: { role: 'Executor B', row: 0, col: 1, span: 1, branch: 'fix/auth-bug' },
    t3: { role: 'Executor C', row: 0, col: 2, span: 1, branch: 'feat/webhooks' },
    t4: { role: 'Reviewer A', row: 1, col: 0, span: 1, branch: 'feat/rate-limiting' },
    t5: { role: 'Reviewer B', row: 1, col: 1, span: 1, branch: 'fix/auth-bug' },
    t6: { role: 'Reviewer C', row: 1, col: 2, span: 1, branch: 'feat/webhooks' },
  },
  steps: [
    {
      stage: 'setup',
      title: 'Prepare terminals',
      active: ['t1', 't2', 't3', 't4', 't5', 't6'],
      modes: {},
      lines: {
        t1: [
          { type: 'dim', text: '# Executor A — main' },
          { type: 'shell', text: '$ git checkout -b feat/rate-limiting && claude' },
        ],
        t2: [
          { type: 'dim', text: '# Executor B — worktree' },
          { type: 'shell', text: '$ git worktree add -b fix/auth-bug ../proj-B develop' },
          { type: 'shell', text: '$ cd ../proj-B && claude' },
        ],
        t3: [
          { type: 'dim', text: '# Executor C — worktree' },
          { type: 'shell', text: '$ git worktree add -b feat/webhooks ../proj-C develop' },
          { type: 'shell', text: '$ cd ../proj-C && claude' },
        ],
        t4: [
          { type: 'dim', text: '# Reviewer A' },
          { type: 'shell', text: '$ claude --worktree' },
        ],
        t5: [
          { type: 'dim', text: '# Reviewer B' },
          { type: 'shell', text: '$ cd ../proj-B && claude --worktree' },
        ],
        t6: [
          { type: 'dim', text: '# Reviewer C' },
          { type: 'shell', text: '$ cd ../proj-C && claude --worktree' },
        ],
      },
    },
    {
      stage: 'start',
      title: '/start all executors',
      active: ['t1', 't2', 't3'],
      modes: { t1: 'auto-accept', t2: 'auto-accept', t3: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/start' },
          { type: 'agent', text: '● Ready. Task: rate limiting.' },
        ],
        t2: [
          { type: 'user', text: '/start' },
          { type: 'agent', text: '● Ready. Task: auth token fix.' },
        ],
        t3: [
          { type: 'user', text: '/start' },
          { type: 'agent', text: '● Ready. Task: webhook endpoints.' },
        ],
      },
    },
    {
      stage: 'plan',
      title: 'Plan all three tasks',
      active: ['t1', 't2', 't3'],
      modes: { t1: 'plan mode', t2: 'plan mode', t3: 'plan mode' },
      lines: {
        t1: [
          { type: 'user', text: 'Add rate limiting. 100 req/15min per IP.' },
          { type: 'agent', text: '● Plan: middleware + routes + tests.' },
        ],
        t2: [
          { type: 'user', text: 'Fix token refresh after password change.' },
          { type: 'agent', text: '● Plan: revocation check + test.' },
        ],
        t3: [
          { type: 'user', text: 'Add webhook endpoints for order events.' },
          { type: 'agent', text: '● Plan: routes + handlers + retry logic + tests.' },
        ],
      },
    },
    {
      stage: 'review',
      title: 'Review all plans',
      active: ['t4', 't5', 't6'],
      modes: { t4: 'auto-accept', t5: 'auto-accept', t6: 'auto-accept' },
      arrow: { from: 't1', to: 't4', label: 'plans' },
      lines: {
        t4: [
          { type: 'user', text: 'Review: [rate limiting plan]' },
          { type: 'agent', text: '● Add standardHeaders: true.' },
        ],
        t5: [
          { type: 'user', text: 'Review: [token fix plan]' },
          { type: 'agent', text: '● Add token version field.' },
        ],
        t6: [
          { type: 'user', text: 'Review: [webhook plan]' },
          { type: 'agent', text: '● Add HMAC signature verification for security.' },
        ],
      },
    },
    {
      stage: 'review',
      title: 'Feedback → update all plans',
      active: ['t1', 't2', 't3'],
      modes: { t1: 'plan mode', t2: 'plan mode', t3: 'plan mode' },
      arrow: { from: 't4', to: 't1', label: 'feedback' },
      lines: {
        t1: [{ type: 'agent', text: '● Plan updated with standardHeaders.' }],
        t2: [{ type: 'agent', text: '● Plan updated with token version.' }],
        t3: [{ type: 'agent', text: '● Plan updated with HMAC verification.' }],
      },
    },
    {
      stage: 'execute',
      title: 'Execute all three',
      active: ['t1', 't2', 't3'],
      modes: { t1: 'auto-accept', t2: 'auto-accept', t3: 'auto-accept' },
      lines: {
        t1: [
          { type: 'agent', text: '● Implementing rate limiting...' },
          { type: 'tool', text: '  Write(src/middleware/rate-limiter.js)' },
          { type: 'ok', text: '  └ ✓ 196 tests passing' },
        ],
        t2: [
          { type: 'agent', text: '● Fixing token refresh...' },
          { type: 'tool', text: '  Edit(src/auth/token-store.js)' },
          { type: 'ok', text: '  └ ✓ 201 tests passing' },
        ],
        t3: [
          { type: 'agent', text: '● Building webhook endpoints...' },
          { type: 'tool', text: '  Write(src/routes/webhooks.js)' },
          { type: 'tool', text: '  Write(src/handlers/webhook-handler.js)' },
          { type: 'ok', text: '  └ ✓ 218 tests passing' },
        ],
      },
    },
    {
      stage: 'simplify',
      title: '/simplify all',
      active: ['t4', 't5', 't6'],
      modes: { t4: 'auto-accept', t5: 'auto-accept', t6: 'auto-accept' },
      lines: {
        t4: [
          { type: 'user', text: '/simplify' },
          { type: 'agent', text: '● Clean.' },
        ],
        t5: [
          { type: 'user', text: '/simplify' },
          { type: 'agent', text: '● Clean.' },
        ],
        t6: [
          { type: 'user', text: '/simplify' },
          { type: 'agent', text: '● Clean.' },
        ],
      },
    },
    {
      stage: 'verify',
      title: '/verify all',
      active: ['t1', 't2', 't3'],
      modes: { t1: 'auto-accept', t2: 'auto-accept', t3: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/verify' },
          { type: 'ok', text: '  └ ✓ All checks pass' },
        ],
        t2: [
          { type: 'user', text: '/verify' },
          { type: 'ok', text: '  └ ✓ All checks pass' },
        ],
        t3: [
          { type: 'user', text: '/verify' },
          { type: 'ok', text: '  └ ✓ All checks pass' },
        ],
      },
    },
    {
      stage: 'ship',
      title: '/commit-push-pr all',
      active: ['t1', 't2', 't3'],
      modes: { t1: 'auto-accept', t2: 'auto-accept', t3: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/commit-push-pr' },
          { type: 'ok', text: '  └ ✓ PR #12 → develop' },
        ],
        t2: [
          { type: 'user', text: '/commit-push-pr' },
          { type: 'ok', text: '  └ ✓ PR #13 → develop' },
        ],
        t3: [
          { type: 'user', text: '/commit-push-pr' },
          { type: 'ok', text: '  └ ✓ PR #14 → develop' },
        ],
      },
    },
    {
      stage: 'done',
      title: 'Post-merge',
      active: [],
      modes: {},
      lines: {},
    },
  ],
};

// ---------------------------------------------------------------------------
// Boris Mode — "Boris Mode" (6 terminals, specialist roles)
// ---------------------------------------------------------------------------
const boris = {
  name: 'Boris Mode',
  subtitle: '6 terminals — specialist roles, nothing idle',
  columns: 3,
  terminals: {
    t1: { role: 'Main A', row: 0, col: 0, span: 1, branch: 'feat/rate-limiting' },
    t2: { role: 'Main B', row: 0, col: 1, span: 1, branch: 'fix/auth-bug' },
    t3: { role: 'Explorer', row: 0, col: 2, span: 1, branch: 'develop' },
    t4: { role: 'Reviewer', row: 1, col: 0, span: 1, branch: 'feat/rate-limiting' },
    t5: { role: 'Test Writer', row: 1, col: 1, span: 1, branch: 'feat/rate-limiting' },
    t6: { role: 'Bug Fix', row: 1, col: 2, span: 1, branch: 'fix/ci-flake' },
  },
  steps: [
    {
      stage: 'setup',
      title: 'Prepare specialists',
      active: ['t1', 't2', 't3', 't4', 't5', 't6'],
      modes: {},
      lines: {
        t1: [
          { type: 'dim', text: '# Main A — primary feature' },
          { type: 'shell', text: '$ git checkout -b feat/rate-limiting && claude' },
        ],
        t2: [
          { type: 'dim', text: '# Main B — secondary task' },
          { type: 'shell', text: '$ git worktree add -b fix/auth-bug ../proj-B develop' },
          { type: 'shell', text: '$ cd ../proj-B && claude' },
        ],
        t3: [
          { type: 'dim', text: '# Explorer — research & spikes' },
          { type: 'shell', text: '$ claude --worktree' },
        ],
        t4: [
          { type: 'dim', text: '# Reviewer — plan & code review' },
          { type: 'shell', text: '$ claude --worktree' },
        ],
        t5: [
          { type: 'dim', text: '# Test Writer — dedicated tests' },
          { type: 'shell', text: '$ claude --worktree' },
        ],
        t6: [
          { type: 'dim', text: '# Bug Fix — on-call for issues' },
          { type: 'shell', text: '$ claude --worktree' },
        ],
      },
    },
    {
      stage: 'start',
      title: '/start + explore',
      active: ['t1', 't3'],
      modes: { t1: 'auto-accept', t3: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/start' },
          { type: 'agent', text: '● Ready. Task: rate limiting middleware.' },
        ],
        t3: [
          {
            type: 'user',
            text: 'Research: how do other Express projects handle rate limiting? Check popular OSS repos.',
          },
          { type: 'agent', text: '● Searching GitHub for rate limiting patterns...' },
          { type: 'tool', text: '  WebSearch("express rate limiting middleware best practices")' },
          { type: 'result', text: '  └ 5 results' },
        ],
      },
    },
    {
      stage: 'plan',
      title: 'Plan with research',
      active: ['t1', 't3'],
      modes: { t1: 'plan mode', t3: 'auto-accept' },
      lines: {
        t1: [
          {
            type: 'user',
            text: 'Add rate limiting. Use findings from Explorer terminal.',
          },
          { type: 'agent', text: '● Planning with research context...' },
          { type: 'agent', text: '  1. Use express-rate-limit with Redis store' },
          { type: 'agent', text: '  2. Tiered limits: 100/15min public, 1000/15min authenticated' },
          { type: 'agent', text: '  3. Return Retry-After header on 429' },
        ],
        t3: [
          {
            type: 'agent',
            text: '● Found: most projects use redis-backed stores for distributed rate limiting.',
          },
          {
            type: 'agent',
            text: '● Pattern: tiered limits by auth status. Stripe uses 100/25/10k tiers.',
          },
        ],
      },
    },
    {
      stage: 'review',
      title: 'Review plan',
      active: ['t4'],
      modes: { t4: 'auto-accept' },
      arrow: { from: 't1', to: 't4', label: 'plan' },
      lines: {
        t4: [
          { type: 'user', text: 'Review: [rate limiting plan with Redis + tiers]' },
          { type: 'agent', text: "● I'll review as a staff engineer..." },
          { type: 'tool', text: '  Read(src/config/redis.js)' },
          { type: 'result', text: '  └ 45 lines' },
          {
            type: 'agent',
            text: '● Good plan. Consider adding a bypass key for health checks.',
          },
        ],
      },
    },
    {
      stage: 'review',
      title: 'Feedback → update plan',
      active: ['t1'],
      modes: { t1: 'plan mode' },
      arrow: { from: 't4', to: 't1', label: 'feedback' },
      lines: {
        t1: [
          { type: 'user', text: 'Add health check bypass. Update plan.' },
          { type: 'agent', text: '● Updated. /health and /ready will skip rate limiting.' },
        ],
      },
    },
    {
      stage: 'execute',
      title: 'Execute + start Task B',
      active: ['t1', 't2'],
      modes: { t1: 'auto-accept', t2: 'plan mode' },
      lines: {
        t1: [
          { type: 'agent', text: '● Implementing rate limiting with Redis...' },
          { type: 'tool', text: '  Bash(npm install express-rate-limit rate-limit-redis)' },
          { type: 'result', text: '  └ added 2 packages' },
          { type: 'tool', text: '  Write(src/middleware/rate-limiter.js)' },
          { type: 'result', text: '  └ Created (42 lines)' },
          { type: 'tool', text: '  Bash(npm test 2>&1 | tail -5)' },
          { type: 'ok', text: '  └ ✓ 196 tests passing' },
        ],
        t2: [
          { type: 'user', text: '/start' },
          { type: 'agent', text: '● Ready. Task: fix auth token refresh.' },
          { type: 'user', text: 'Fix: refresh token rejected after password change.' },
          { type: 'agent', text: '● Planning fix...' },
        ],
      },
    },
    {
      stage: 'execute',
      title: 'Test writer spawns + bug appears',
      active: ['t5', 't6'],
      modes: { t5: 'auto-accept', t6: 'auto-accept' },
      arrow: { from: 't1', to: 't5', label: 'code ready' },
      lines: {
        t5: [
          {
            type: 'user',
            text: 'Write comprehensive tests for src/middleware/rate-limiter.js. Cover: basic limiting, Redis failover, tiered auth, health check bypass.',
          },
          { type: 'agent', text: '● Writing tests...' },
          { type: 'tool', text: '  Read(src/middleware/rate-limiter.js)' },
          { type: 'result', text: '  └ 42 lines' },
          { type: 'tool', text: '  Write(tests/middleware/rate-limiter.test.js)' },
          { type: 'result', text: '  └ Created (89 lines)' },
          { type: 'ok', text: '  └ ✓ 12 new tests passing' },
        ],
        t6: [
          { type: 'warn', text: '⚠ CI alert: flaky test in auth.test.js' },
          { type: 'user', text: 'Fix the flaky CI test in tests/auth/auth.test.js' },
          { type: 'agent', text: '● Investigating flaky test...' },
          { type: 'tool', text: '  Read(tests/auth/auth.test.js)' },
          { type: 'result', text: '  └ 156 lines' },
          {
            type: 'agent',
            text: '● Found: race condition in token expiry mock. Adding deterministic timer.',
          },
          { type: 'tool', text: '  Edit(tests/auth/auth.test.js)' },
          { type: 'result', text: '  └ Modified (+4 lines)' },
          { type: 'ok', text: '  └ ✓ Flaky test now stable (ran 50x)' },
        ],
      },
    },
    {
      stage: 'simplify',
      title: '/simplify Task A',
      active: ['t4'],
      modes: { t4: 'auto-accept' },
      lines: {
        t4: [
          { type: 'user', text: '/simplify' },
          { type: 'agent', text: '● Running review agents...' },
          { type: 'sub', text: '  ├─ Reuse · Done' },
          { type: 'sub', text: '  ├─ Quality · Done' },
          { type: 'sub', text: '  └─ Efficiency · Done' },
          { type: 'agent', text: '● Suggestion: extract Redis config to shared module.' },
        ],
      },
    },
    {
      stage: 'verify',
      title: '/verify Task A',
      active: ['t1'],
      modes: { t1: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/verify' },
          { type: 'tool', text: '  Bash(npm test 2>&1 | tail -5)' },
          { type: 'ok', text: '  └ ✓ 208 tests passing (12 new)' },
          { type: 'tool', text: '  Bash(npm run lint 2>&1)' },
          { type: 'ok', text: '  └ ✓ 0 errors, 0 warnings' },
        ],
      },
    },
    {
      stage: 'ship',
      title: '/commit-push-pr',
      active: ['t1', 't6'],
      modes: { t1: 'auto-accept', t6: 'auto-accept' },
      lines: {
        t1: [
          { type: 'user', text: '/commit-push-pr' },
          { type: 'ok', text: '  └ ✓ PR #12 created → develop' },
        ],
        t6: [
          { type: 'user', text: '/commit-push-pr' },
          { type: 'ok', text: '  └ ✓ PR #15 created → develop (CI fix)' },
        ],
      },
    },
    {
      stage: 'done',
      title: 'Post-merge',
      active: [],
      modes: {},
      lines: {},
    },
  ],
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export const levels = {
  2: level2,
  3: level3,
  4: level4,
  5: level5,
  boris,
};

// Post-merge text shown on the "done" step
export const postMergeBase = [
  'After merging PRs on GitHub:',
  'git checkout develop && git pull',
  '→ conflicts? → /conflict-resolver → /sync',
  '→ clean? → /sync',
];

export const postMergeCleanup = [
  'Cleanup:',
  'git worktree remove ../project-B && git worktree prune && git branch -d [branches]',
];
