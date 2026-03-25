# Permissions

Worclaude configures pre-approved tool permissions in `.claude/settings.json`. These permissions let Claude use common development tools without prompting for confirmation on every invocation. Permissions are organized as an allow list.

## Why Pre-Approved Permissions

Without pre-approved permissions, Claude Code asks for user confirmation on every shell command and file edit. This creates friction during normal development. Worclaude pre-approves safe, common operations so Claude can work fluidly while still requiring confirmation for unusual or destructive commands.

## Permission Syntax

Permissions use the format `Tool(pattern)` where the pattern supports wildcards:

| Format | Meaning | Example |
|---|---|---|
| `Bash(command:*)` | Allow a shell command with any arguments | `Bash(git status:*)` |
| `Edit(glob)` | Allow editing files matching a glob pattern | `Edit(src/**)` |

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

| Pattern | Scope |
|---|---|
| `Edit(.claude/**)` | All workflow configuration files |
| `Edit(docs/**)` | All documentation |
| `Edit(src/**)` | Source code |
| `Edit(tests/**)`, `Edit(test/**)` | Test files |
| `Edit(README*)` | README files |
| `Edit(*.md)` | Any Markdown file |
| `Edit(package.json)` | Node.js package manifest |
| `Edit(pyproject.toml)` | Python project config |
| `Edit(.github/**)` | GitHub Actions and configs |

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

Edit `.claude/settings.json` directly to add permissions:

```json
{
  "permissions": {
    "allow": [
      "// -- Custom --",
      "Bash(terraform:*)",
      "Bash(kubectl:*)",
      "Edit(*.tf)",
      "Edit(k8s/**)"
    ]
  }
}
```

Comment strings (lines starting with `//`) are supported for organization. They are not valid JSON but Worclaude handles them for readability. The `worclaude status` command counts only non-comment permission rules.

## Deny List

The `permissions` object also supports a `deny` key for explicitly blocking commands. Worclaude does not install any deny rules by default, but they can be added manually:

```json
{
  "permissions": {
    "allow": [ ... ],
    "deny": [
      "Bash(rm -rf:*)"
    ]
  }
}
```

---

## See Also

- [Hooks](/reference/hooks) -- the other half of settings.json
- [Configuration](/reference/configuration) -- full settings.json structure
- [CLI Commands](/reference/commands) -- `worclaude status` reports permission rule counts
