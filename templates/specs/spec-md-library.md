# SPEC.md — {project_name}

## Product Overview
{description}

## Tech Stack
| Layer         | Technology                        |
|---------------|-----------------------------------|
| Language      | {tech_stack_table}                |{docker_row}
| Build         | [e.g. tsup, rollup, setuptools]   |
| Testing       | [e.g. Vitest, pytest, Jest]       |
| Docs          | [e.g. TypeDoc, Sphinx, JSDoc]     |
| Registry      | [e.g. npm, PyPI, crates.io]       |
| CI/CD         | [e.g. GitHub Actions]             |

## Public API
[List all exports that form the public contract. Internal helpers should not appear here.]
```
[functionName](param: Type, options?: OptionsType): ReturnType
  — [Description. Throws: ErrorType when condition]

class [ClassName]
  constructor(config: ConfigType)
  [method](args): ReturnType    — [description]

type [TypeName] = { [field]: Type; [field]?: Type }
```

## Configuration Options
| Option        | Type     | Default    | Description                          |
|---------------|----------|------------|--------------------------------------|
| [option]      | string   | [default]  | [What it controls]                   |
| [option]      | boolean  | `false`    | [When to enable]                     |
| [option]      | number   | [default]  | [Valid range and effect]             |
| [add more...] | [type]   | [default]  | [description]                        |

## Usage Examples
```[language]
// Basic
import { [functionName] } from '{project_name}';
const result = [functionName]([exampleArgs]);

// With configuration
const instance = new [ClassName]({ /* [options] */ });
const output = instance.[method]([args]);

// Error handling
try { [functionName]([invalidArgs]); }
catch (error) { /* [ErrorType]: [message] */ }
```

## Compatibility Matrix
| Runtime/Version        | Supported | Notes                      |
|------------------------|-----------|----------------------------|
| [Node.js >= 18]       | Yes       | [ESM and CJS]             |
| [Node.js 16]          | No        | [Reason]                   |
| [Python >= 3.10]      | Yes       | [Type hints required]      |
| [Browser (ESM)]       | Yes       | [Bundle size: ~N kB gzip]  |
| [add environments...] | [Yes/No]  | [notes]                    |

- **Module formats:** [ESM, CJS, UMD — which are shipped]
- **Type definitions:** [Bundled .d.ts / inline / separate package]
- **Peer dependencies:** [List any, with version ranges]

## Implementation Phases

### Phase 1 — Foundation
- [ ] Project scaffolding and build pipeline
- [ ] TypeScript / type setup and strict config
- [ ] Core function: [primary export]
- [ ] Unit tests for core function
- [ ] CI pipeline (lint, test, build)

### Phase 2 — Core API
- [ ] Remaining public functions and classes
- [ ] Configuration and options handling
- [ ] Error types and validation
- [ ] Comprehensive test coverage (>90%)
- [ ] JSDoc / docstrings for all exports

### Phase 3 — Distribution
- [ ] Bundle optimization (tree-shaking, size budget)
- [ ] Generated API documentation
- [ ] README with usage examples
- [ ] CHANGELOG setup (conventional commits)
- [ ] Publish to registry (npm/PyPI)
- [ ] Integration tests with real consumers
