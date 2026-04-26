# Permissions

Worclaude configures pre-approved tool permissions in `.claude/settings.json`. These permissions let Claude use common development tools without prompting for confirmation on every invocation. Claude Code's permission model has three rule types: `allow`, `ask`, and `deny`.

## Why Pre-Approved Permissions

Without pre-approved permissions, Claude Code asks for user confirmation on every shell command and file edit. This creates friction during normal development. Worclaude pre-approves safe, common operations so Claude can work fluidly while still requiring confirmation for unusual or destructive commands.

## Rule Types

Each rule type handles a different point on the safety-vs-friction spectrum:

| Type    | Behavior                                         | When to Use                                                           |
| ------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `allow` | Tool runs immediately without prompting          | Safe, common operations (reads, standard build/test commands, lint)   |
| `ask`   | Tool prompts the user before each invocation     | Commands that are usually fine but occasionally risky                 |
| `deny`  | Tool is blocked — Claude cannot invoke it at all | Commands that must never run (destructive, exfiltrating, credentials) |

**Evaluation order:** `deny` → `ask` → `allow`. The first matching rule wins. A command that matches both an `allow` pattern and a `deny` pattern will be denied, because `deny` is checked first.

Worclaude installs `allow` rules and a small targeted `deny` set (see [Default Deny Rules](#default-deny-rules) below). `ask` rules are user-managed policy — add them manually as your project requires.

## Permission Syntax

Permissions use the format `Tool(pattern)` where the pattern supports wildcards:

| Format            | Meaning                                     | Example              |
| ----------------- | ------------------------------------------- | -------------------- |
| `Bash(command:*)` | Allow a shell command with any arguments    | `Bash(git status:*)` |
| `Edit(glob)`      | Allow editing files matching a glob pattern | `Edit(src/**)`       |

The `*` wildcard matches any arguments. The `**` glob matches any path depth.

## Universal Permissions (Base)

These permissions are installed for every project regardless of tech stack.

### Read-Only / Exploration

Commands that inspect without modifying:

```
find, grep, cat, ls, head, tail, wc, which, tree, diff,
sort, uniq, awk, sed, cut, jq, xargs, ps, du, df, env, printenv
```

### Git

Full git workflow including GitHub CLI:

```
git status, git log, git diff, git branch, git checkout,
git add, git commit, git push, git pull, git fetch, git merge,
git stash, git worktree, git rebase, git cherry-pick, git tag, gh
```

### Common Dev Tools

General-purpose commands:

```
echo, mkdir, touch, cp, mv, curl, wget, tar, zip, unzip, make
```

### Edit Permissions

File editing by path pattern:

| Pattern                           | Scope                            |
| --------------------------------- | -------------------------------- |
| `Edit(.claude/**)`                | All workflow configuration files |
| `Edit(docs/**)`                   | All documentation                |
| `Edit(src/**)`                    | Source code                      |
| `Edit(tests/**)`, `Edit(test/**)` | Test files                       |
| `Edit(README*)`                   | README files                     |
| `Edit(*.md)`                      | Any Markdown file                |
| `Edit(package.json)`              | Node.js package manifest         |
| `Edit(pyproject.toml)`            | Python project config            |
| `Edit(.github/**)`                | GitHub Actions and configs       |

## Per-Stack Permissions

Additional permissions are appended based on the selected tech stack. Each stack adds both Bash commands and Edit patterns for its ecosystem.

### Python

```
python, python3, pip, pip3, uv, uvx, pytest, ruff, mypy,
black, isort, flake8, poetry, pdm
Edit(*.py), Edit(pyproject.toml), Edit(requirements*.txt),
Edit(setup.py), Edit(setup.cfg)
```

### Node.js / TypeScript

```
npm, npx, node, tsc, tsx, jest, vitest, eslint, prettier,
pnpm, yarn, bun
Edit(*.ts), Edit(*.tsx), Edit(*.js), Edit(*.jsx), Edit(*.json),
Edit(*.css), Edit(*.scss), Edit(tsconfig*.json), Edit(.eslintrc*),
Edit(vite.config.*), Edit(next.config.*), Edit(webpack.config.*)
```

### Java

```
java, javac, javap, mvn, mvnw, gradle, gradlew, google-java-format
Edit(*.java), Edit(pom.xml), Edit(build.gradle*),
Edit(settings.gradle*), Edit(gradle.properties)
```

### Go

```
go, gofmt, golangci-lint
Edit(*.go), Edit(go.mod), Edit(go.sum)
```

### Rust

```
cargo, rustc, rustup, clippy
Edit(*.rs), Edit(Cargo.toml), Edit(Cargo.lock)
```

### Docker

```
docker, docker-compose, docker compose
Edit(Dockerfile*), Edit(docker-compose*), Edit(.dockerignore)
```

Additional stack configs exist for C# / .NET, C / C++, PHP, Ruby, Kotlin, Swift, Dart / Flutter, Scala, Elixir, and Zig. Each follows the same pattern of adding relevant CLI tools and file edit permissions.

## Adding Custom Permissions

Edit `.claude/settings.json` directly to add permissions. The full shape with all three rule types looks like this:

```json
{
  "permissions": {
    "allow": [
      "// -- Custom --",
      "Bash(terraform:*)",
      "Bash(kubectl:*)",
      "Edit(*.tf)",
      "Edit(k8s/**)"
    ],
    "ask": ["Bash(git push:*)", "Bash(npm publish:*)"],
    "deny": ["Bash(rm -rf:*)"]
  }
}
```

Comment strings (lines starting with `//`) are supported for organization. They are not valid JSON but Worclaude handles them for readability. The `worclaude status` command counts only non-comment `allow` rules.

## Ask Rules

The `ask` array lists commands that should prompt the user for confirmation at runtime instead of running silently. Use this for commands that are usually fine but occasionally risky — commands where the cost of an unintended invocation is high enough that you want a human in the loop, but low enough that blocking them outright would be too restrictive.

Typical candidates:

- `Bash(git push:*)` — pushes are reversible but visible to collaborators
- `Bash(npm publish:*)` — publishes are hard to reverse and affect downstream consumers
- `Bash(docker push:*)` — image pushes hit shared registries
- `Bash(terraform apply:*)` — applies mutate real infrastructure
- `Edit(.env*)` — secrets files deserve a pause

Example:

```json
{
  "permissions": {
    "allow": [ ... ],
    "ask": [
      "Bash(git push:*)",
      "Bash(npm publish:*)",
      "Edit(.env*)"
    ]
  }
}
```

Worclaude does not install any `ask` rules by default. Choosing which commands deserve a confirmation prompt is project policy, not scaffolding.

## Default Deny Rules

Worclaude scaffolds a small, targeted `deny` set into `templates/settings/base.json`. Deny rules take precedence over `allow` and `ask`, so a matched deny is a hard block. The default set covers three categories:

### 1. Secret-file Read/Edit

Blocks Claude's built-in Read and Edit tools from accessing common secret-file paths:

```json
"Read(./.env)", "Read(./.env.*)",
"Read(./secrets/**)",
"Edit(./.env)", "Edit(./.env.*)", "Edit(./secrets/**)",
"Read(./*.pem)", "Read(./*.key)",
"Read(./id_rsa)", "Read(./id_ed25519)",
"Read(~/.ssh/**)",
"Read(~/.aws/credentials)",
"Read(~/.config/gh/hosts.yml)"
```

These use gitignore-style matching and are the **most reliable** deny patterns Claude Code supports — the path-pattern matcher is well-defined, unlike Bash argument constraints.

### 2. `.env`-targeting Bash file viewers

Closes the gap that Read denies don't cover (`Read(./.env)` blocks the Read tool, not `cat .env` in Bash):

```json
"Bash(cat *.env*)", "Bash(head *.env*)", "Bash(tail *.env*)",
"Bash(less *.env*)", "Bash(more *.env*)", "Bash(grep *.env*)"
```

These enumerate the **commands** users would run, not the arguments — which is the official guidance for robust matching. Compound-command awareness (`&&`, `|`, `;`) means each subcommand is matched independently, so `git diff && cat .env` is still blocked.

### 3. Catastrophic `rm -rf` patterns

```json
"Bash(rm -rf /)", "Bash(rm -rf /*)",
"Bash(rm -fr /)", "Bash(rm -fr /*)",
"Bash(rm -rf ~)", "Bash(rm -rf ~/*)",
"Bash(rm -rf $HOME)", "Bash(rm -rf $HOME/*)"
```

Claude Code's sandbox already prompts on `rm`/`rmdir` against `/`, `$HOME`, or "critical system paths" — these deny rules turn that prompt into a hard block.

### Coverage limitations

Worclaude is explicit about what these rules don't catch:

- **Bash deny rules constraining arguments are inherently fragile** (per Claude Code's own docs). The `rm -rf /` set covers literal-match catastrophes; variants like `rm --recursive --force /`, `rm -fr //`, or shell-variable indirection (`RM=rm; $RM -rf /`) **evade**. Treat as defense against accidents, not a sandbox.
- **The `.env` Bash family doesn't cover every read tool.** `awk`, `xxd`, `od`, `vim`, `python -c "print(open('.env').read())"`, and similar workarounds **evade**.
- **Read/Edit denies apply to Claude's tools, not Bash subprocesses.** A `Read(./.env)` deny blocks the Read tool but does not prevent `cat .env` in Bash unless the matching Bash deny is also present.
- **For OS-level enforcement that survives all of these,** enable Claude Code's [sandbox](https://code.claude.com/docs/en/sandboxing) — it gives filesystem and network restrictions that no shell command can bypass.

### Hardening further

Common additions teams pick up:

```json
"deny": [
  // Network exfil — block curl/wget entirely; use WebFetch with allowlist instead
  "Bash(curl *)", "Bash(wget *)",

  // Pipe-to-shell antipattern (note: still fragile per docs)
  "Bash(curl * | sh)", "Bash(curl * | bash)",

  // Cloud-credential files specific to your toolchain
  "Read(~/.docker/config.json)",
  "Read(~/.kube/config)"
]
```

If you take the `Bash(curl *)` route, remember to add a `WebFetch(domain:...)` allow rule for legitimate fetches, otherwise Claude can't reach the network at all.

---

## See Also

- [Hooks](/reference/hooks) -- the other half of settings.json
- [Configuration](/reference/configuration) -- full settings.json structure
- [CLI Commands](/reference/commands) -- `worclaude status` reports permission rule counts
