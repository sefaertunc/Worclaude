import path from 'node:path';
import fs from 'fs-extra';
import { readFile } from './file.js';

export async function readJsonl(filePath) {
  if (!(await fs.pathExists(filePath))) return [];
  const content = await readFile(filePath);
  const out = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // Skip malformed lines; never block the report
    }
  }
  return out;
}

function tally(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function pairAgentEvents(events) {
  const startsByKey = new Map();
  const pairs = [];
  for (const event of events) {
    const session = event.session || 'no-session';
    const agent = event.agent || 'unknown';
    const key = `${session}::${agent}`;
    if (event.event === 'start') {
      startsByKey.set(key, event);
      continue;
    }
    if (event.event !== 'stop') continue;
    const start = startsByKey.get(key);
    if (!start) {
      pairs.push({
        agent,
        session: event.session,
        startTs: null,
        stopTs: event.ts,
        durationMs: null,
        exit: event.exit || 'unknown',
      });
      continue;
    }
    startsByKey.delete(key);
    const startMs = Date.parse(start.ts);
    const stopMs = Date.parse(event.ts);
    const durationMs =
      Number.isFinite(startMs) && Number.isFinite(stopMs) ? stopMs - startMs : null;
    pairs.push({
      agent,
      session: event.session,
      startTs: start.ts,
      stopTs: event.ts,
      durationMs,
      exit: event.exit || 'completed',
    });
  }
  return pairs;
}

function summarizeAgents(pairs) {
  const byAgent = new Map();
  for (const pair of pairs) {
    if (!byAgent.has(pair.agent)) {
      byAgent.set(pair.agent, {
        agent: pair.agent,
        invocations: 0,
        completed: 0,
        failed: 0,
        durationMsTotal: 0,
        durationMsCount: 0,
      });
    }
    const entry = byAgent.get(pair.agent);
    entry.invocations += 1;
    if (pair.exit === 'completed') entry.completed += 1;
    else if (pair.exit === 'failed' || pair.exit === 'error') entry.failed += 1;
    if (Number.isFinite(pair.durationMs)) {
      entry.durationMsTotal += pair.durationMs;
      entry.durationMsCount += 1;
    }
  }
  return [...byAgent.values()]
    .map((e) => ({
      agent: e.agent,
      invocations: e.invocations,
      completed: e.completed,
      failed: e.failed,
      avgDurationMs:
        e.durationMsCount > 0 ? Math.round(e.durationMsTotal / e.durationMsCount) : null,
    }))
    .sort((a, b) => b.invocations - a.invocations);
}

async function listInstalledSkills(projectRoot) {
  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  if (!(await fs.pathExists(skillsDir))) return [];
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

function daysAgo(date, fromMs = Date.now()) {
  const ts = Date.parse(date);
  if (!Number.isFinite(ts)) return null;
  return Math.floor((fromMs - ts) / (24 * 60 * 60 * 1000));
}

function buildAnomaliesAndSuggestions({ installedSkills, skillStats, agentStats, fromMs }) {
  const anomalies = [];
  const suggestions = [];

  // Only flag never-loaded skills once SOME skill data exists. On a fresh
  // install with zero captured events the comparison is uninformative noise.
  if (skillStats.length > 0) {
    const loadedSkills = new Set(skillStats.map((s) => s.key));
    const neverLoaded = installedSkills.filter((s) => !loadedSkills.has(s));
    for (const skill of neverLoaded) {
      anomalies.push({
        kind: 'skill-never-loaded',
        message: `Skill \`${skill}\` is installed but never appeared in skill-loads.jsonl.`,
      });
    }
  }

  for (const stat of skillStats) {
    if (!stat.lastSeen) continue;
    const days = daysAgo(stat.lastSeen, fromMs);
    if (days !== null && days > 30) {
      suggestions.push({
        message: `Skill \`${stat.key}\` not loaded in ${days} days — consider retiring or updating its description for keyword match.`,
      });
    }
  }

  for (const stat of agentStats) {
    if (stat.invocations >= 3 && stat.failed > stat.completed) {
      anomalies.push({
        kind: 'agent-fails-more-than-completes',
        message: `Agent \`${stat.agent}\` failed ${stat.failed} of ${stat.invocations} invocations (more failures than completions).`,
      });
    }
  }

  return { anomalies, suggestions };
}

function attachLastSeen(skillStats, skillEvents) {
  const lastByKey = new Map();
  for (const event of skillEvents) {
    const skill = event.skill;
    if (!skill) continue;
    const prev = lastByKey.get(skill);
    if (!prev || event.ts > prev) {
      lastByKey.set(skill, event.ts);
    }
  }
  return skillStats.map((s) => ({ ...s, lastSeen: lastByKey.get(s.key) || null }));
}

export async function computeReport(projectRoot, options = {}) {
  const obsDir = path.join(projectRoot, '.claude', 'observability');
  const fromMs = options.now || Date.now();

  const skillEvents = await readJsonl(path.join(obsDir, 'skill-loads.jsonl'));
  const commandEvents = await readJsonl(path.join(obsDir, 'command-invocations.jsonl'));
  const agentEvents = await readJsonl(path.join(obsDir, 'agent-events.jsonl'));
  const installedSkills = await listInstalledSkills(projectRoot);

  const skillStatsRaw = tally(skillEvents, (e) => e.skill);
  const skillStats = attachLastSeen(skillStatsRaw, skillEvents);
  const commandStats = tally(commandEvents, (e) => e.command);
  const agentPairs = pairAgentEvents(agentEvents);
  const agentStats = summarizeAgents(agentPairs);

  const { anomalies, suggestions } = buildAnomaliesAndSuggestions({
    installedSkills,
    skillStats,
    agentStats,
    fromMs,
  });

  return {
    generatedAt: new Date(fromMs).toISOString(),
    counts: {
      skillEvents: skillEvents.length,
      commandEvents: commandEvents.length,
      agentEvents: agentEvents.length,
      agentPairs: agentPairs.length,
      installedSkills: installedSkills.length,
    },
    skillStats,
    commandStats,
    agentStats,
    anomalies,
    suggestions,
  };
}

function formatDuration(ms) {
  if (ms === null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s - m * 60);
  return `${m}m ${r}s`;
}

export function renderMarkdown(report) {
  const lines = [];
  lines.push('# Observability Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');

  lines.push('## Captured Volume');
  lines.push('');
  lines.push(
    `- ${report.counts.skillEvents} skill loads · ${report.counts.commandEvents} command invocations · ${report.counts.agentPairs} agent invocations (${report.counts.agentEvents} raw start/stop events)`
  );
  lines.push(`- ${report.counts.installedSkills} skills installed in this project`);
  lines.push('');

  lines.push('## Top Skills');
  lines.push('');
  if (report.skillStats.length === 0) {
    lines.push('_No skill loads captured yet._');
  } else {
    lines.push('| Skill | Loads | Last seen |');
    lines.push('|---|---|---|');
    for (const stat of report.skillStats.slice(0, 10)) {
      lines.push(`| \`${stat.key}\` | ${stat.count} | ${stat.lastSeen || '—'} |`);
    }
  }
  lines.push('');

  lines.push('## Top Commands');
  lines.push('');
  if (report.commandStats.length === 0) {
    lines.push('_No command invocations captured yet._');
  } else {
    lines.push('| Command | Invocations |');
    lines.push('|---|---|');
    for (const stat of report.commandStats.slice(0, 10)) {
      lines.push(`| \`${stat.key}\` | ${stat.count} |`);
    }
  }
  lines.push('');

  lines.push('## Agent Invocations');
  lines.push('');
  if (report.agentStats.length === 0) {
    lines.push('_No agent events captured yet._');
  } else {
    lines.push('| Agent | Invocations | Completed | Failed | Avg duration |');
    lines.push('|---|---|---|---|---|');
    for (const stat of report.agentStats.slice(0, 10)) {
      lines.push(
        `| \`${stat.agent}\` | ${stat.invocations} | ${stat.completed} | ${stat.failed} | ${formatDuration(stat.avgDurationMs)} |`
      );
    }
  }
  lines.push('');

  lines.push('## Anomalies');
  lines.push('');
  if (report.anomalies.length === 0) {
    lines.push('_None detected._');
  } else {
    for (const a of report.anomalies) {
      lines.push(`- ${a.message}`);
    }
  }
  lines.push('');

  lines.push('## Suggestions');
  lines.push('');
  if (report.suggestions.length === 0) {
    lines.push('_None._');
  } else {
    for (const s of report.suggestions) {
      lines.push(`- ${s.message}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}
