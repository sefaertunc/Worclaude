import path from 'node:path';
import { readFile, fileExists } from '../utils/file.js';
import { TECH_STACKS } from '../data/agents.js';

export const LANGUAGE_COMMANDS = {
  python: {
    heading: 'Python',
    commands: [
      'python -m pytest                # Run tests',
      'ruff check .                    # Lint',
      'ruff format .                   # Format',
    ],
  },
  node: {
    heading: 'Node.js / TypeScript',
    commands: [
      'npm test                        # Run tests',
      'npx eslint .                    # Lint',
      'npx prettier --write .          # Format',
    ],
  },
  java: {
    heading: 'Java',
    commands: [
      'mvn test                        # Run tests',
      'mvn checkstyle:check            # Lint',
      'mvn spotless:apply              # Format',
    ],
  },
  csharp: {
    heading: 'C# / .NET',
    commands: [
      'dotnet test                     # Run tests',
      'dotnet format --verify-no-changes # Lint',
      'dotnet format                   # Format',
    ],
  },
  cpp: {
    heading: 'C / C++',
    commands: [
      'cmake --build build && ctest    # Build & test',
      'clang-tidy src/*.cpp            # Lint',
      'clang-format -i src/*.[ch]pp    # Format',
    ],
  },
  go: {
    heading: 'Go',
    commands: [
      'go test ./...                   # Run tests',
      'golangci-lint run               # Lint',
      'gofmt -w .                      # Format',
    ],
  },
  php: {
    heading: 'PHP',
    commands: [
      'vendor/bin/phpunit              # Run tests',
      'vendor/bin/phpstan analyse      # Lint',
      'vendor/bin/php-cs-fixer fix .   # Format',
    ],
  },
  ruby: {
    heading: 'Ruby',
    commands: [
      'bundle exec rspec               # Run tests',
      'rubocop                         # Lint',
      'rubocop -A                      # Format',
    ],
  },
  kotlin: {
    heading: 'Kotlin',
    commands: [
      'gradle test                     # Run tests',
      'detekt                          # Lint',
      'ktlint -F                       # Format',
    ],
  },
  swift: {
    heading: 'Swift',
    commands: [
      'swift test                      # Run tests',
      'swiftlint                       # Lint',
      'swift-format format -r . -i     # Format',
    ],
  },
  rust: {
    heading: 'Rust',
    commands: [
      'cargo test                      # Run tests',
      'cargo clippy                    # Lint',
      'cargo fmt                       # Format',
    ],
  },
  dart: {
    heading: 'Dart / Flutter',
    commands: [
      'dart test                       # Run tests',
      'dart analyze                    # Lint',
      'dart format .                   # Format',
    ],
  },
  scala: {
    heading: 'Scala',
    commands: [
      'sbt test                        # Run tests',
      'sbt scalafix                    # Lint',
      'scalafmt                        # Format',
    ],
  },
  elixir: {
    heading: 'Elixir',
    commands: [
      'mix test                        # Run tests',
      'mix credo                       # Lint',
      'mix format                      # Format',
    ],
  },
  zig: {
    heading: 'Zig',
    commands: [
      'zig build test                  # Run tests',
      'zig build                       # Build (lint via compiler)',
      'zig fmt .                       # Format',
    ],
  },
};

export function buildCommandsBlock(languages, useDocker) {
  const lines = ['```bash'];
  for (const lang of languages) {
    const entry = LANGUAGE_COMMANDS[lang];
    if (!entry) continue;
    if (lines.length > 1) lines.push('');
    lines.push(`# ${entry.heading}`);
    lines.push(...entry.commands);
  }
  if (useDocker) {
    if (lines.length > 1) lines.push('');
    lines.push('# Docker');
    lines.push('docker compose up -d            # Start services');
    lines.push('docker compose down             # Stop services');
  }
  if (lines.length === 1) {
    lines.push('# Add your project-specific commands here');
  }
  lines.push('```');
  return lines.join('\n');
}

function buildTechStackText(languages, useDocker) {
  const lines = languages
    .filter((l) => l !== 'other')
    .map((l) => {
      const entry = TECH_STACKS.find((s) => s.value === l);
      return `- ${entry ? entry.name : l}`;
    });
  if (languages.includes('other') && lines.length === 0) {
    lines.push('- Not specified');
  }
  if (useDocker) lines.push('- Docker');
  return lines.join('\n');
}

async function readPackageJsonFields(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!(await fileExists(pkgPath))) return {};
  try {
    const content = await readFile(pkgPath);
    const pkg = JSON.parse(content);
    return { name: pkg.name, description: pkg.description };
  } catch {
    return {};
  }
}

/**
 * Reconstruct template variables from workflow-meta.json for repair flows.
 * Best-effort: pulls projectName/description from package.json, tech stack
 * from meta.techStack, commands block from meta.techStack + meta.useDocker.
 */
export async function buildAgentsMdVariables(meta, projectRoot) {
  const languages = meta.techStack || [];
  const useDocker = meta.useDocker || false;
  const pkg = await readPackageJsonFields(projectRoot);
  const projectName = pkg.name || path.basename(projectRoot);
  const description = pkg.description || 'A project scaffolded with Worclaude';
  const techStackText = buildTechStackText(languages, useDocker);
  const commandsText = buildCommandsBlock(languages, useDocker);
  return {
    project_name: projectName,
    description,
    tech_stack_filled_during_init: techStackText,
    commands_filled_during_init: commandsText,
    timestamp: new Date().toISOString(),
  };
}
