<template>
  <div class="workflow-demo" tabindex="0" @keydown="handleKeydown">
    <div class="demo-inner">
      <!-- Header -->
      <div class="demo-header">
        <div class="demo-title">Worclaude Workflow</div>
        <div class="demo-subtitle">{{ currentLevel.subtitle }}</div>
      </div>

      <!-- Tab bar -->
      <div class="tab-bar">
        <button
          v-for="key in tabOrder"
          :key="key"
          class="tab-btn"
          :class="{ 'tab-active': activeLevel === key }"
          @click="selectLevel(key)"
        >
          <span v-if="key === 'boris'" class="tab-fire">&#x1F525;</span>
          {{ tabLabels[key] }}
        </button>
      </div>

      <!-- Step dots -->
      <div class="step-dots">
        <button
          v-for="(step, i) in currentSteps"
          :key="i"
          class="step-dot"
          :class="{
            'dot-current': i === stepIndex,
            'dot-completed': i < stepIndex,
            'dot-future': i > stepIndex,
          }"
          :style="i === stepIndex ? { boxShadow: '0 0 8px 2px ' + stageColor(step.stage) } : {}"
          :title="step.title"
          @click="goToStep(i)"
        >
          <span
            class="dot-inner"
            :style="i <= stepIndex ? { background: stageColor(step.stage) } : {}"
          ></span>
        </button>
        <span class="step-label">{{ currentStep.title }}</span>
      </div>

      <!-- Terminal area -->
      <div class="terminal-area">
        <!-- Top row -->
        <div class="terminal-row" :style="{ gridTemplateColumns: gridCols }">
          <template v-for="[tid, term] in topRow" :key="tid">
            <div
              class="terminal-wrapper"
              :class="{ 'terminal-inactive': !isActive(tid) }"
              :style="term.span > 1 ? { gridColumn: 'span ' + term.span } : {}"
            >
              <div class="terminal-card">
                <div class="terminal-header">
                  <div class="terminal-header-left">
                    <svg class="pixel-mascot" width="16" height="16" viewBox="0 0 8 8" style="image-rendering: pixelated" v-html="mascotRects"></svg>
                    <div class="header-text">
                      <div class="header-title-row">
                        <span class="app-name">Claude Code</span>
                        <span class="role-badge">{{ term.role }}</span>
                      </div>
                      <div class="header-sub">Opus 4.6 · ~/project</div>
                    </div>
                  </div>
                </div>
                <div class="terminal-body">
                  <div
                    v-for="(line, li) in accumulatedLines[tid]"
                    :key="li"
                    class="tline"
                    :class="'tline-' + line.type"
                  >
                    <span v-if="line.type === 'user'" class="prompt-char">&gt; </span>{{ line.text }}
                  </div>
                  <div v-if="isActive(tid) && currentStep.stage !== 'done'" class="cursor-line">
                    <span class="blinking-cursor">█</span>
                  </div>
                </div>
                <div class="terminal-statusbar">
                  <span class="branch-name">‹{{ term.branch }}›</span>
                  <span
                    v-if="currentModes[tid]"
                    class="mode-badge"
                    :class="modeClass(currentModes[tid])"
                  >
                    ›› {{ currentModes[tid] }}
                  </span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Arrow badge between rows -->
        <div v-if="currentStep.arrow && bottomRow.length > 0" class="arrow-row">
          <div class="arrow-badge">
            {{ arrowRole('from') }} → {{ currentStep.arrow.label }} → {{ arrowRole('to') }}
          </div>
        </div>

        <!-- Bottom row -->
        <div
          v-if="bottomRow.length > 0"
          class="terminal-row"
          :style="{ gridTemplateColumns: gridCols }"
        >
          <template v-for="[tid, term] in bottomRow" :key="tid">
            <div
              class="terminal-wrapper"
              :class="{ 'terminal-inactive': !isActive(tid) }"
              :style="term.span > 1 ? { gridColumn: 'span ' + term.span } : {}"
            >
              <div class="terminal-card">
                <div class="terminal-header">
                  <div class="terminal-header-left">
                    <svg class="pixel-mascot" width="16" height="16" viewBox="0 0 8 8" style="image-rendering: pixelated" v-html="mascotRects"></svg>
                    <div class="header-text">
                      <div class="header-title-row">
                        <span class="app-name">Claude Code</span>
                        <span class="role-badge">{{ term.role }}</span>
                      </div>
                      <div class="header-sub">Opus 4.6 · ~/project</div>
                    </div>
                  </div>
                </div>
                <div class="terminal-body">
                  <div
                    v-for="(line, li) in accumulatedLines[tid]"
                    :key="li"
                    class="tline"
                    :class="'tline-' + line.type"
                  >
                    <span v-if="line.type === 'user'" class="prompt-char">&gt; </span>{{ line.text }}
                  </div>
                  <div v-if="isActive(tid) && currentStep.stage !== 'done'" class="cursor-line">
                    <span class="blinking-cursor">█</span>
                  </div>
                </div>
                <div class="terminal-statusbar">
                  <span class="branch-name">‹{{ term.branch }}›</span>
                  <span
                    v-if="currentModes[tid]"
                    class="mode-badge"
                    :class="modeClass(currentModes[tid])"
                  >
                    ›› {{ currentModes[tid] }}
                  </span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Post-merge footer -->
      <div v-if="currentStep.stage === 'done'" class="post-merge">
        <div class="post-merge-block">
          <div v-for="line in postMergeBase" :key="line" class="post-line">{{ line }}</div>
        </div>
        <div v-if="hasWorktrees" class="post-merge-block post-cleanup">
          <div v-for="line in postMergeCleanup" :key="line" class="post-line">{{ line }}</div>
        </div>
      </div>

      <!-- Controls -->
      <div class="controls">
        <button class="ctrl-btn" :disabled="stepIndex === 0" @click="prev">&larr; Prev</button>
        <button class="ctrl-btn" :disabled="stepIndex >= currentSteps.length - 1" @click="next">
          Next &rarr;
        </button>
        <button class="ctrl-btn ctrl-reset" @click="reset">&#x21BA; Reset</button>
        <span class="step-counter">{{ stepIndex + 1 }}/{{ currentSteps.length }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  levels,
  tabOrder,
  tabLabels,
  stageColors,
  postMergeBase,
  postMergeCleanup,
} from './workflow-demo-data.js';

const mascotRects = [
  '<rect x="1" y="0" width="6" height="1" fill="#f97316"/>',
  '<rect x="0" y="1" width="8" height="1" fill="#f97316"/>',
  '<rect x="0" y="2" width="1" height="1" fill="#f97316"/>',
  '<rect x="1" y="2" width="1" height="1" fill="#fbbf24"/>',
  '<rect x="2" y="2" width="1" height="1" fill="#111"/>',
  '<rect x="3" y="2" width="2" height="1" fill="#f97316"/>',
  '<rect x="5" y="2" width="1" height="1" fill="#111"/>',
  '<rect x="6" y="2" width="1" height="1" fill="#fbbf24"/>',
  '<rect x="7" y="2" width="1" height="1" fill="#f97316"/>',
  '<rect x="0" y="3" width="8" height="2" fill="#f97316"/>',
  '<rect x="1" y="5" width="6" height="1" fill="#f97316"/>',
  '<rect x="0" y="5" width="1" height="1" fill="#ea580c"/>',
  '<rect x="7" y="5" width="1" height="1" fill="#ea580c"/>',
  '<rect x="1" y="6" width="2" height="1" fill="#ea580c"/>',
  '<rect x="5" y="6" width="2" height="1" fill="#ea580c"/>',
].join('');

const MODE_CLASSES = { 'plan mode': 'mode-plan', 'auto-accept': 'mode-accept' };

const activeLevel = ref('2');
const stepIndex = ref(0);

const currentLevel = computed(() => levels[activeLevel.value]);
const currentSteps = computed(() => currentLevel.value.steps);
const currentStep = computed(() => currentSteps.value[stepIndex.value]);

const accumulatedLines = computed(() => {
  const result = {};
  for (const tid of Object.keys(currentLevel.value.terminals)) {
    const segments = [];
    for (let i = 0; i <= stepIndex.value; i++) {
      const lines = currentSteps.value[i].lines?.[tid];
      if (lines) segments.push(lines);
    }
    result[tid] = segments.flat();
  }
  return result;
});

const currentModes = computed(() => currentStep.value.modes || {});

const sortedTerminals = computed(() => {
  return Object.entries(currentLevel.value.terminals).sort((a, b) => {
    if (a[1].row !== b[1].row) return a[1].row - b[1].row;
    return a[1].col - b[1].col;
  });
});

const topRow = computed(() => sortedTerminals.value.filter(([, t]) => t.row === 0));
const bottomRow = computed(() => sortedTerminals.value.filter(([, t]) => t.row === 1));

const gridCols = computed(() => `repeat(${currentLevel.value.columns}, 1fr)`);

const hasWorktrees = computed(() => activeLevel.value !== '2');

function arrowRole(direction) {
  const arrow = currentStep.value.arrow;
  if (!arrow) return '';
  const term = currentLevel.value.terminals[arrow[direction]];
  return term ? term.role : arrow[direction];
}

function isActive(tid) {
  return (currentStep.value.active || []).includes(tid);
}

function stageColor(stage) {
  return stageColors[stage] || '#777';
}

function modeClass(mode) {
  return MODE_CLASSES[mode] || '';
}

function selectLevel(key) {
  activeLevel.value = key;
  stepIndex.value = 0;
}

function next() {
  if (stepIndex.value < currentSteps.value.length - 1) {
    stepIndex.value++;
  }
}

function prev() {
  if (stepIndex.value > 0) {
    stepIndex.value--;
  }
}

function goToStep(i) {
  stepIndex.value = Math.max(0, Math.min(i, currentSteps.value.length - 1));
}

function reset() {
  stepIndex.value = 0;
}

function handleKeydown(e) {
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    next();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prev();
  }
}
</script>

<style scoped>
/* ===== Layout ===== */
.workflow-demo {
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  background: #060606;
  padding: 32px 16px;
  font-family: var(--font-sans);
  color: #e0e0e0;
  min-height: 80vh;
  outline: none;
}

.demo-inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== Header ===== */
.demo-header {
  text-align: center;
  margin-bottom: 20px;
}

.demo-title {
  font-size: 20px;
  font-weight: 600;
  color: #ccc;
  letter-spacing: 0.5px;
}

.demo-subtitle {
  font-size: 14px;
  color: #777;
  margin-top: 4px;
}

/* ===== Tabs ===== */
.tab-bar {
  display: flex;
  gap: 4px;
  justify-content: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab-btn {
  all: unset;
  padding: 6px 16px;
  font-size: 13px;
  color: #888;
  cursor: pointer;
  border-radius: 6px;
  background: #0a0a0a;
  border: 1px solid #1e1e1e;
  transition: all 0.15s ease;
  font-family: var(--font-sans);
}

.tab-btn:hover {
  color: #bbb;
  border-color: #333;
}

.tab-active {
  color: #e0e0e0;
  border-color: #444;
  background: #141414;
}

.tab-fire {
  margin-right: 2px;
}

/* ===== Step dots ===== */
.step-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.step-dot {
  all: unset;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s ease;
}

.dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #333;
  transition: background 0.15s ease;
}

.step-label {
  font-size: 12px;
  color: #777;
  margin-left: 8px;
}

/* ===== Terminal area ===== */
.terminal-area {
  display: flex;
  flex-direction: column;
}

.terminal-row {
  display: grid;
  gap: 10px;
}

/* ===== Arrow badge ===== */
.arrow-row {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.arrow-badge {
  display: inline-block;
  padding: 4px 16px;
  font-size: 11px;
  color: #999;
  background: #111;
  border: 1px solid #1e1e1e;
  border-radius: 20px;
  font-family: var(--font-sans);
}

/* ===== Terminal card ===== */
.terminal-wrapper {
  transition: opacity 0.2s ease;
}

.terminal-inactive {
  opacity: 0.2;
  pointer-events: none;
}

.terminal-card {
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.5;
}

.terminal-inactive .terminal-card {
  background: #050505;
  border-color: #181818;
}

/* ===== Terminal header ===== */
.terminal-header {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  background: #0e0e0e;
  border-bottom: 1px solid #1e1e1e;
}

.terminal-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pixel-mascot {
  flex-shrink: 0;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-name {
  font-size: 11px;
  color: #999;
  font-family: var(--font-sans);
}

.role-badge {
  font-size: 10px;
  color: #aaa;
  background: #1a1a1a;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid #2a2a2a;
  font-family: var(--font-sans);
}

.header-sub {
  font-size: 10px;
  color: #555;
  font-family: var(--font-sans);
}

/* ===== Terminal body ===== */
.terminal-body {
  padding: 8px 10px;
  min-height: 40px;
  max-height: 340px;
  overflow-y: auto;
}

/* Scrollbar */
.terminal-body::-webkit-scrollbar {
  width: 4px;
}
.terminal-body::-webkit-scrollbar-track {
  background: transparent;
}
.terminal-body::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 2px;
}

/* ===== Terminal lines ===== */
.tline {
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt-char {
  color: #777;
}

.tline-user {
  color: #e0e0e0;
}

.tline-shell {
  color: #d0d0d0;
}

.tline-agent {
  color: #e8b830;
}

.tline-tool {
  color: #909090;
}

.tline-result {
  color: #555;
}

.tline-ok {
  color: #50d070;
}

.tline-sub {
  color: #707070;
}

.tline-dim {
  color: #555;
}

.tline-warn {
  color: #e8b830;
}

/* ===== Cursor ===== */
.cursor-line {
  margin-top: 2px;
}

.blinking-cursor {
  color: #777;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* ===== Status bar ===== */
.terminal-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 10px;
  background: #0e0e0e;
  border-top: 1px solid #1e1e1e;
  font-size: 11px;
}

.branch-name {
  color: #50d070;
}

.mode-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
}

.mode-plan {
  color: #d4a017;
  background: rgba(212, 160, 23, 0.1);
  border: 1px solid rgba(212, 160, 23, 0.3);
}

.mode-accept {
  color: #e07030;
  background: rgba(224, 112, 48, 0.1);
  border: 1px solid rgba(224, 112, 48, 0.3);
}

/* ===== Post-merge footer ===== */
.post-merge {
  margin-top: 16px;
  padding: 12px 16px;
  background: #0a0a0a;
  border: 1px solid #1e1e1e;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
}

.post-merge-block {
  color: #999;
}

.post-cleanup {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #1e1e1e;
}

.post-line {
  line-height: 1.6;
}

/* ===== Controls ===== */
.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 0;
}

.ctrl-btn {
  all: unset;
  padding: 6px 14px;
  font-size: 13px;
  color: #aaa;
  cursor: pointer;
  border-radius: 6px;
  background: #0a0a0a;
  border: 1px solid #1e1e1e;
  transition: all 0.15s ease;
  font-family: var(--font-sans);
}

.ctrl-btn:hover:not(:disabled) {
  color: #ddd;
  border-color: #333;
}

.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.ctrl-reset {
  margin-left: 8px;
}

.step-counter {
  font-size: 12px;
  color: #555;
  margin-left: 8px;
  font-variant-numeric: tabular-nums;
}

/* ===== Responsive ===== */
@media (max-width: 900px) {
  .terminal-row {
    grid-template-columns: 1fr !important;
  }

  .terminal-wrapper {
    grid-column: span 1 !important;
  }

  .terminal-inactive {
    display: none;
  }

  .demo-inner {
    max-width: 100%;
  }
}

@media (max-width: 600px) {
  .workflow-demo {
    padding: 16px 8px;
  }

  .tab-btn {
    padding: 4px 10px;
    font-size: 12px;
  }

  .terminal-card {
    font-size: 11px;
  }
}
</style>
