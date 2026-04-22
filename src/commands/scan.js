import path from 'node:path';
import { scanProject, writeDetectionReport } from '../core/project-scanner/index.js';
import * as display from '../utils/display.js';

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

function summarizeValue(result) {
  const { value, field } = result;

  switch (field) {
    case 'readme':
      return truncate(value.projectDescription || '(no description extracted)', 80);
    case 'ci': {
      const n = value.workflows?.length || 0;
      return `${value.provider}, ${n} workflow${n === 1 ? '' : 's'}`;
    }
    case 'testing':
      return value.framework + (value.configFile ? ` (${value.configFile})` : '');
    case 'scripts': {
      const parts = [];
      for (const key of ['dev', 'test', 'build', 'lint']) {
        if (value[key]) parts.push(`${key}=${value[key].key}`);
      }
      return parts.join(' ') || '(no standard scripts)';
    }
    case 'envVariables':
      return `${value.names.length} variables`;
    case 'orm':
      return value.name;
    case 'monorepo':
      return `${value.tool} (${value.packagePaths.length} packages)`;
    case 'specDocs':
      return `${value.length} doc${value.length === 1 ? '' : 's'}`;
    case 'frameworks':
      return value.map((v) => (v.version ? `${v.name} ${v.version}` : v.name)).join(', ');
    default:
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.join(', ');
      return JSON.stringify(value);
  }
}

function formatField(field) {
  return field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function renderSummary(report, reportPath) {
  const byConfidence = { high: [], medium: [], low: [] };
  for (const r of report.results) {
    byConfidence[r.confidence]?.push(r);
  }

  display.newline();
  display.sectionHeader('WORCLAUDE SCAN');
  display.dim(`Path: ${report.projectRoot}`);
  display.newline();

  for (const tier of ['high', 'medium', 'low']) {
    const items = byConfidence[tier];
    display.barLine(
      display.white(`${tier[0].toUpperCase() + tier.slice(1)} confidence (${items.length})`)
    );
    if (items.length === 0) {
      display.dim('(none)');
    } else {
      for (const item of items) {
        const label = formatField(item.field).padEnd(20);
        const summary = summarizeValue(item);
        const source = item.source ? display.dimColor(`(${item.source})`) : '';
        console.log(`  ${display.green('✓')} ${label} ${summary} ${source}`);
      }
    }
    display.newline();
  }

  display.barLine(display.white(`Errors (${report.errors.length})`));
  if (report.errors.length === 0) {
    display.dim('(none)');
  } else {
    for (const err of report.errors) {
      console.log(`  ${display.red('✗')} ${err.detector}: ${err.kind} — ${err.message}`);
    }
  }
  display.newline();

  display.success(
    `Report written to ${path.relative(report.projectRoot, reportPath) || reportPath}`
  );
  display.newline();
}

export async function scanCommand(options = {}) {
  const projectRoot = path.resolve(options.path || process.cwd());
  const quiet = !!options.quiet;
  const jsonMode = !!options.json;

  let report;
  try {
    report = await scanProject(projectRoot);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  let reportPath;
  try {
    reportPath = await writeDetectionReport(report, projectRoot);
  } catch (err) {
    console.error(`Error writing detection report: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (!quiet) {
    renderSummary(report, reportPath);
  }
}
