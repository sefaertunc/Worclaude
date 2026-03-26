# SPEC.md — {project_name}

## Product Overview
{description}

## Tech Stack
| Layer        | Technology                        |
|--------------|-----------------------------------|
| Language     | {tech_stack_table}                |{docker_row}
| CLI Framework| [e.g. Commander.js, Click, Cobra] |
| Output       | [e.g. Chalk, Rich, colored]      |
| Testing      | [e.g. Vitest, pytest]            |
| Distribution | [e.g. npm, PyPI, Homebrew]       |

## Commands
| Command                   | Description                          | Flags / Options                |
|---------------------------|--------------------------------------|--------------------------------|
| `{project_name} init`    | [Initialize configuration/project]   | `--template <name>`, `--force` |
| `{project_name} [verb]`  | [Primary action of the tool]         | `--flag`, `-f <value>`         |
| `{project_name} [verb]`  | [Secondary action]                   | `--verbose`, `--json`          |
| `{project_name} config`  | [View/edit configuration]            | `--set <key=value>`, `--list`  |
| `{project_name} --help`  | Show help text                       | —                              |
| `{project_name} --version`| Print version                       | —                              |
| [add commands...]         | [description]                        | [flags]                        |

## Configuration
**Config file:** `~/.{project_name}rc` or `.{project_name}.json` in project root

**Precedence (highest to lowest):** CLI flags > env vars (`{PROJECT_NAME}_[KEY]`) > project config > user config > defaults

| Variable                     | Purpose                          | Default     |
|------------------------------|----------------------------------|-------------|
| `{PROJECT_NAME}_CONFIG`      | [Path to config file]            | [~/.rc]     |
| `{PROJECT_NAME}_[OPTION]`    | [Override for specific option]   | [default]   |

## Input / Output Formats
- **stdin:** [Does the tool read from stdin? Pipe support?]
- **stdout:** [Human-readable by default, machine-readable with `--json`]
- **stderr:** [Error messages, progress info, warnings]
- **File I/O:** [Does it read/write files? Which formats?]

Example output:
```
[Show a realistic example of the tool's primary output]
```

## Error Handling
| Exit Code | Meaning                              |
|-----------|--------------------------------------|
| 0         | Success                              |
| 1         | General error                        |
| 2         | Invalid usage / bad arguments        |
| 3         | Configuration error                  |
| [code]    | [specific error condition]           |

- **Error format:** `Error: [message]` to stderr, non-zero exit code
- **Verbose mode:** `--verbose` or `-v` for debug output
- **Graceful shutdown:** Handle SIGINT/SIGTERM for cleanup

## Implementation Phases

### Phase 1 — Foundation
- [ ] Project scaffolding and CLI argument parsing
- [ ] Config file loading and validation
- [ ] Help text and version flag
- [ ] Basic `init` command
- [ ] Error handling framework

### Phase 2 — Core Commands
- [ ] Primary command ([verb]) with full functionality
- [ ] Secondary commands
- [ ] stdin/stdout pipe support
- [ ] `--json` output mode

### Phase 3 — Polish
- [ ] Interactive prompts, progress indicators, `--no-color` support
- [ ] Shell completions (bash, zsh, fish)
- [ ] Tests for all commands and edge cases
- [ ] Package and publish
